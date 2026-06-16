# Search

Scryon search finds calls by meaning, not just exact keywords. A search for "resignation" surfaces calls tagged with it or where resignation was discussed. A search for "call where we agreed on pricing" finds calls where pricing decisions were made even if those exact words weren't used.

## Current implementation — Hybrid BM25 + Vector (RRF)

Search combines two signals merged via **Reciprocal Rank Fusion (RRF)**:

```
Query: "resignation"

BM25 path   → "resignation" in tags/title/summary → rank #1 (exact match, fast)
Vector path  → embedding similarity on call content → rank #2 (semantic)

RRF score = 1/(60 + bm25_rank) + 1/(60 + vector_rank)
          = 1/61 + 1/62 = 0.0325    ← surfaces as top result ✓

Unrelated call:
  BM25 path  → no FTS match (absent from ranking)
  Vector path → distant embedding → rank #8

RRF score = 0 + 1/(60 + 8) = 0.015  ← suppressed naturally, no threshold needed ✓
```

### Why not pure vector search?

Cosine similarity between a short query ("resignation") and a long document (full transcript) is inherently noisy. The cosine distance is often 0.4–0.65 even for a directly relevant call — right at the boundary of any reasonable threshold. No static cutoff works reliably. RRF sidesteps this by combining two independent ranking signals rather than filtering by a single number.

### Database schema

```sql
-- call_records: search_vector kept in sync by a BEFORE INSERT/UPDATE trigger
ALTER TABLE call_records ADD COLUMN search_vector tsvector;
CREATE INDEX idx_call_records_search_fts ON call_records USING GIN (search_vector);

-- call_embeddings: stores text-embedding-3-small vector (1536 dims)
-- Added in V15 migration; used for semantic (vector) path of hybrid search
```

The `search_vector` is built from: **title + short_summary + contact_name + organization + tags**. It is updated automatically by the `call_records_search_vector_trigger` whenever any of these fields change.

### Query flow

```
User query
  ↓
embed(query)  →  float[1536] query vector
                                              ┌── BM25 CTE ──────────────────────────┐
                                              │  plainto_tsquery('english', query)    │
                                              │  ts_rank on search_vector             │
                                              │  → ordered list with bm25_rank        │
                                              └───────────────────────────────────────┘
                                              ┌── Vector CTE ─────────────────────────┐
                                              │  embedding <=> CAST(vector AS vector)  │
                                              │  → ordered list with vec_rank          │
                                              └───────────────────────────────────────┘
                                              FULL OUTER JOIN on call_id
                                              ORDER BY 1/(60+bm25_rank) + 1/(60+vec_rank) DESC
  ↓
Ranked call IDs → batch-load CallRecord → CallSummaryResponse[]
```

### Fallback behaviour

| Condition | Behaviour |
|---|---|
| `SCRYON_EMBEDDING_ENABLED=false` | BM25-only search (exact keywords still work) |
| Embedding API down | BM25-only search (logged at WARN) |
| No FTS match, no embedding match | Empty results |

### Configuration

| Env var | Default | Purpose |
|---|---|---|
| `SCRYON_EMBEDDING_ENABLED` | `false` | Enables vector path (and embedding generation on call completion) |
| `SCRYON_EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `SCRYON_EMBEDDING_TIMEOUT_SECONDS` | `30` | Timeout for embedding API calls |

### Backfilling existing calls

Embeddings are generated automatically when a call completes. Calls processed before `SCRYON_EMBEDDING_ENABLED=true` have no embedding and are found by BM25 only. To index them:

```bash
curl -X POST https://api.scryon.app/api/calls/search/backfill \
  -H "Authorization: Bearer <token>" \
  -H "X-API-Key: <key>"
```

The `search_vector` column is backfilled automatically by the V16 Flyway migration on first deploy.

---

## Future roadmap — Large library improvements

The current hybrid implementation handles libraries of up to a few thousand calls well. As the call library grows or query accuracy needs increase, the following improvements should be implemented in order.

### 1. Include transcript text in full-text search index

**When:** BM25 misses keywords that appear only in the transcript (not in title/summary/tags).

**Current gap:** The `search_vector` indexes metadata only (title, summary, tags). If a user searches for "Shreya" and that name appears only in the transcript — not in the summary or contact metadata — BM25 won't find it.

**Fix:** Store transcript `cleanText` (or an excerpt) in a separate column and include it in `search_vector`:

```sql
-- Add transcript text column
ALTER TABLE call_records ADD COLUMN search_text TEXT;

-- Rebuild trigger to include transcript text
CREATE OR REPLACE FUNCTION scryon_update_call_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.short_summary, '') || ' ' ||
    coalesce(NEW.contact_name, '') || ' ' ||
    coalesce(NEW.organization, '') || ' ' ||
    coalesce(NEW.search_text, '') || ' ' ||   -- ← transcript text
    coalesce(regexp_replace(coalesce(NEW.tags_json, '[]'), '["\[\],]', ' ', 'g'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Populate `search_text` during the analysis pipeline after normalization (reuse `CallEmbeddingService.buildEmbeddingText()` which already loads `cleanText` from the artifact store).

**Effort:** ~2 hours. New Flyway migration + write `search_text` in `CallProcessingService` after normalization.
---
### 2. HNSW index for vector search
**When:** Vector search queries slow down as `call_embeddings` grows beyond ~50,000 rows.

**Current gap:** pgvector defaults to an exact (brute-force) scan unless an index is created. For small libraries this is fast (`<5ms`), but at scale a full table scan on 1536-dim vectors becomes expensive.

**Fix:** Add an HNSW (Hierarchical Navigable Small World) index — the fastest approximate nearest-neighbour algorithm supported by pgvector:

```sql
CREATE INDEX idx_call_embeddings_hnsw
    ON call_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

Tune `m` and `ef_construction` based on accuracy vs. speed trade-off:
- `m = 16, ef_construction = 64` — default, good for most cases
- `m = 32, ef_construction = 128` — better recall, slower build
- At query time: `SET hnsw.ef_search = 100` for higher recall

**Effort:** One migration, no application code changes. Index build runs in the background and doesn't lock the table.

---

### 3. Cross-encoder reranking

**When:** Library grows beyond ~10,000 calls and users report ranking inaccuracy (RRF ranks a less-relevant call above the best match).
**What it is:** After hybrid search returns the top N candidates, pass each (query, call_summary) pair through a cross-encoder model to produce an exact relevance score. More accurate than RRF because the cross-encoder sees both the query and the document together.
**Architecture:**
```
Hybrid RRF → top 50 candidates
                ↓
Cross-encoder (e.g. cross-encoder/ms-marco-MiniLM-L-6-v2 via HuggingFace Inference API)
  Input: [(query, call1_summary), (query, call2_summary), ..., (query, call50_summary)]
  Output: [score_1, score_2, ..., score_50]
                ↓
Re-sorted top 10 → return to client
```
**Options:**
- **HuggingFace Inference API** — hosted, no GPU needed, ~$0.0001/call
- **Self-hosted** (Docker + `sentence-transformers`) — zero cost, requires GPU/CPU compute
- **OpenAI GPT-4o-mini as reranker** — use structured output to score relevance

**Implementation sketch:**

```java
@Service
public class CrossEncoderReranker {
    public List<CallSummaryResponse> rerank(String query,
                                            List<CallSummaryResponse> candidates,
                                            int topK) {
        // Call cross-encoder API with (query, summary) pairs
        // Sort by relevance score, return topK
    }
}

// In CallSearchService:
List<CallSummaryResponse> candidates = hybridSearch(userId, query, 50);
if (candidates.size() > topK && rerankerConfig.isEnabled()) {
    return reranker.rerank(query, candidates, topK);
}
return candidates.subList(0, Math.min(topK, candidates.size()));
```

**Config to add:**
```yaml
scryon:
  search:
    reranker:
      enabled: ${SCRYON_SEARCH_RERANKER_ENABLED:false}
      provider: ${SCRYON_SEARCH_RERANKER_PROVIDER:huggingface}
      model: ${SCRYON_SEARCH_RERANKER_MODEL:cross-encoder/ms-marco-MiniLM-L-6-v2}
      apiKey: ${SCRYON_SEARCH_RERANKER_API_KEY:}
      topKCandidates: ${SCRYON_SEARCH_RERANKER_TOP_K_CANDIDATES:50}
```

**Effort:** ~1 day. New `CrossEncoderReranker` service, new config class, wire into `CallSearchService`.
**Latency impact:** +150–400ms per search query. Only enable when ranking accuracy is more important than latency.
---
### 4. Query expansion for ambiguous short queries
**When:** Short queries like "Anu" (a name) return no results because neither BM25 nor vector matches well.
**What it is:** Before searching, expand the query using an LLM to generate semantic variants:
```
Input:  "Anu"
Output: "Anu, call with Anu, conversation with Anu, discussion with Anu"
```
This enriches both the BM25 query and the embedding input.
**Implementation sketch:**
```java
private String expandQuery(String query) {
    if (query.split("\\s+").length > 3) return query; // skip for long queries
    // Call OpenAI with a short expansion prompt
    String prompt = "Expand this search query for a phone call library: \"" + query + "\". "
                  + "Return 3-5 semantic variants as a comma-separated string. "
                  + "Keep it concise.";
    return llmClient.complete(prompt, 50); // 50 token limit
}
```
**Effort:** ~2 hours. Uses existing `OpenAiAnalysisClient` or a new lightweight LLM call.

**When NOT to use:** If hybrid BM25+vector already returns good results, query expansion adds latency without benefit. Add it only as a fallback when hybrid returns 0 results.

---

### 5. Per-call-type relevance tuning

**When:** Recruiters always search for interview-specific terms; sales users always search for pricing/deal terms. Generic RRF weights don't reflect domain context.

**What it is:** Adjust BM25 field weights based on the user's industry or call type:

```sql
-- Interview-context search: weight candidate name higher
ts_rank(search_vector, query, 32) * 2.0   -- title gets 2x weight
+ ts_rank(search_vector, query, 8) * 1.0   -- body weight normal
```

Or — simpler — add a `call_type` filter to the search query so recruiters only search over `callType = 'interview'` calls.

**Effort:** ~3 hours. Add optional `callType` filter parameter to `GET /api/calls/search?type=interview`.
---
## Implementation priority
| Improvement | Trigger condition | Effort |
|---|---|---|
| **Transcript text in FTS index** | Users search names/terms not in summary | 2 hrs |
| **HNSW vector index** | Vector search latency > 50ms | 30 min (1 migration) |
| **Cross-encoder reranking** | Library > 10k calls, ranking complaints | 1 day |
| **Query expansion** | Short queries consistently miss results | 2 hrs |
| **Per-call-type tuning** | Domain-specific use cases (recruiters, sales) | 3 hrs |
## Code map
| Class | File | Purpose |
|---|---|---|
| `CallSearchService` | `com/scryon/search/` | Orchestrates hybrid search; BM25 fallback |
| `CallEmbeddingRepository` | `com/scryon/search/` | `hybridSearch()` RRF native query; `findSimilarCallIdsWithDistance()` |
| `CallRecordRepository` | `com/scryon/calls/` | `searchByFullText()` BM25-only fallback |
| `EmbeddingService` | `com/scryon/search/` | Embeds text via OpenAI; `toVectorString()` for pgvector format |
| `CallEmbeddingService` | `com/scryon/search/` | Generates and stores call embeddings after pipeline completion |
| `EmbeddingBackfillService` | `com/scryon/search/` | Backfills embeddings for calls processed before feature was enabled |
| `CallSearchController` | `com/scryon/search/` | `GET /api/calls/search`, `POST /api/calls/search/backfill`, `GET /api/calls/search/status` |
| `V15__add_call_embeddings.sql` | `db/migration/` | `call_embeddings` table with `vector(1536)` column |
| `V16__hybrid_search.sql` | `db/migration/` | `search_vector tsvector` column, GIN index, trigger, backfill |

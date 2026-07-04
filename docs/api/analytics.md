# Analytics

Aggregated trends across a user's calls, built from the per-call `sentiment` / `tone` fields already produced by [analysis](analysis.md). Nothing here is a fresh LLM call — it's SQL aggregation over stored analysis results, so it's cheap to poll.

## GET `/api/analytics/vibe`

Sentiment and tone distribution/trend for the authenticated user's calls.

### Query parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `days` | int | 30 | Look-back window in days. |

### Response — `200 OK`

```json
{
  "sentimentDistribution": { "positive": 12, "neutral": 5, "negative": 2, "mixed": 1 },
  "userSentimentDistribution": { "positive": 14, "neutral": 4, "negative": 2 },
  "contactSentimentDistribution": { "positive": 9, "neutral": 6, "negative": 5 },
  "sentimentTrend": [
    { "week": "2026-06-01", "counts": { "positive": 4, "neutral": 2, "negative": 1 } },
    { "week": "2026-06-08", "counts": { "positive": 5, "neutral": 1, "negative": 0 } }
  ],
  "toneProfile": {
    "formality": { "formal": 6, "semi-formal": 9, "informal": 3 },
    "energy": { "low": 2, "medium": 11, "high": 5 },
    "pace": { "slow": 1, "normal": 14, "fast": 3 }
  }
}
```

### Fields

| Field | Type | Notes |
|---|---|---|
| `sentimentDistribution` | map | Overall `sentiment.overall` value → call count, within the window. |
| `userSentimentDistribution` | map | Same, but for `sentiment.userSentiment.overall` (the phone owner's read). |
| `contactSentimentDistribution` | map | Same, for `sentiment.contactSentiment.overall` (the other party's read). |
| `sentimentTrend` | array | One point per ISO week in the window; `counts` is the same shape as `sentimentDistribution`. |
| `toneProfile` | object | Distribution of `tone.formality` / `tone.energy` / `tone.pace` across calls in the window. |

Calls with no stored sentiment/tone (e.g. still processing, or pre-v2 analysis with only `{overall, reason}`) are excluded from the relevant distribution rather than counted as a bucket.

### Errors

| Status | Cause |
|---|---|
| 401 | Missing/invalid auth. |

## Storage

Populated from the `call_sentiment_summary` table, which is written alongside `action_items` when [analysis side effects](analysis.md#code-map) are applied — one row per completed call, denormalising just the fields this endpoint needs so the query doesn't have to deserialise every `ANALYSIS_JSON` artifact on every request.

## Related

- [Features · LLM analysis](../features/analysis.md#enriched-sentiment) — where `sentiment` and `tone` come from.

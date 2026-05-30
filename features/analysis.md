# LLM analysis

The analysis stage turns a normalised transcript into a structured business summary: title, prose summary, **bullet-point summary**, **key discussion points**, action items, sentiment (with per-party + progression), **tone**, and a long tail of typed lists (decisions, risks, opportunities, important dates, …).

> **Provider.** OpenAI by default. Any OpenAI-compatible endpoint works. Configured via `ScryonProperties.Llm` (model, base URL, API key, temperature, timeout).

## What the LLM receives

`AnalysisPrompt` builds a two-part chat completion:

1. A **system prompt** that defines the output schema and the rules (no inventing names/dates, cite `sourceSegmentIds`, avoid generic phrasing, etc.).
2. A **user prompt** containing:
   - A non-PII call metadata block (`callId`, `recordedAt`, `durationSeconds`, optional `title`).
   - The compact transcript view — `language`, `durationSeconds`, `speakers[]`, and segments with stable `seg_NNNN` ids, `speakerId`, role, times, and text.

The transcript is **post-resolution** — by the time it reaches the LLM, speakers are named where evidence allowed, and ids are stable. The model can cite *"Priya said X (seg_0007)"* without inventing names.

## Schema versions

| Version | What's in it |
|---|---|
| **v1** | Prose `executiveSummary`, `sections[]`, flat `Sentiment { overall, reason }`. No tone. |
| **v2** *(current)* | Adds `executiveSummaryBullets[]` (bullet companion to the prose summary), `keyDiscussionPoints[]` (chronological flow), enriched `Sentiment` (numeric `score`, per-party split, `progression[]`, `emotionalSignals[]`), and a new top-level `Tone`. All additions are nullable — v1 artifacts still deserialise unchanged. |

`ScryonAnalysis.CURRENT_SCHEMA_VERSION` is `2`. The endpoint serves whatever was stored on disk: old calls keep their v1 shape until re-analyzed.

## What we get back

```
{
  schemaVersion: 2,
  callType: ...,
  suggestedTitle: ...,
  oneLineSummary: ...,
  executiveSummary: "<prose paragraph>",
  executiveSummaryBullets: [
    { text, category, importance, sourceSegmentIds }       // 3–7 scannable bullets
  ],
  conversationOutcome: ...,
  sections: [ Section ],                                   // dynamic, thematic
  keyDiscussionPoints: [
    { text, topic, phase, speakerId, ..., sourceSegmentIds } // chronological flow
  ],
  actionItems: [ ActionItem ],
  followUps, importantDates, decisions, commitments,
  openQuestions, risks, opportunities,
  peopleMentioned, numbersAndAmounts,
  sentiment: {
    overall, score, reason,
    userSentiment    : { overall, score, notes },
    contactSentiment : { overall, score, notes },
    progression: [ { phase, overall, note, sourceSegmentIds } ],
    emotionalSignals: [ string ]
  },
  tone: {
    overall, descriptors, formality, energy, pace, notes,
    byParty: { userTone, contactTone }                     // PartyTone = { overall, descriptors, notes }
  },
  tags: [ string ],
  qualityWarnings: [ string ]
}
```

The full field reference lives in [API · Analysis](../api/analysis.md). What follows is the *design* of the new pieces.

### Bullets: `executiveSummaryBullets`

The prose `executiveSummary` is great for reading but bad for skimming. `executiveSummaryBullets` is the LLM's parallel **scannable** view of the same content. Rules baked into the prompt:

- 3 to 7 bullets.
- Each is a complete thought (sentence fragment is fine).
- Categories: `context | outcome | next_steps | concern | agreement | decision | blocker | observation`.
- Never duplicate sentences from `executiveSummary` verbatim — rephrase for skim-readability.
- Cite `sourceSegmentIds` wherever possible.

### Key discussion points

`sections` group items by *theme*. `keyDiscussionPoints` lays them out in **narrative order** — what actually happened, in sequence. This is the view a client renders when the user wants a *timeline* of the call without re-reading the transcript.

- 5 to 15 points for a typical 3–15 minute call. Low-signal small talk is dropped.
- Each point names a free-form `topic` and a `phase` (`opening | middle | closing | followup`).
- Speaker attribution (`speakerId`, `speakerLabel`, `speakerDisplayName`, `speakerRole`) is set when one party drove the point; null for joint exchanges.
- `sourceSegmentIds` are always cited.

### Enriched sentiment

v1 sentiment was `{ overall, reason }`. v2 expands it because that wasn't enough signal for clients to render anything richer than a single emoji.

- **`score` ∈ [-1.0, 1.0]** — numeric polarity. `null` only when truly unclear.
- **`userSentiment` / `contactSentiment`** — per-party reads with their own `overall` + `score` + `notes`. **They commonly disagree.** A frustrated customer talking to a calm support agent has `contactSentiment.overall=negative` and `userSentiment.overall=neutral`.
- **`progression`** — 2–4 timeline points (`opening | middle | closing | followup`). Captures *shifts*: "started tense, ended warm" is the classic example.
- **`emotionalSignals`** — 0–6 short adjective tags grounded in the transcript (`frustrated`, `appreciative`, `relieved`, `anxious`, `confident`). Never invented — the LLM is told to leave the array empty when the text doesn't support a tag.

### Tone

**Tone is distinct from sentiment.** Sentiment is polarity (positive/negative). Tone is **register** — *how* things were said (formal, urgent, friendly, terse, …).

A perfectly cordial conversation can be `sentiment.overall=positive` and `tone.overall=transactional`. A heated argument can be `sentiment.overall=negative` and `tone.overall=confrontational`. They aren't redundant.

| Field | Meaning |
|---|---|
| `overall` | Headline tone label from a documented vocabulary. |
| `descriptors` | 1–4 short adjectives capturing nuance. |
| `formality` | `formal \| semi-formal \| informal` |
| `energy` | `low \| medium \| high` |
| `pace` | `slow \| normal \| fast` |
| `notes` | 1–2 sentence rationale. |
| `byParty.userTone` / `contactTone` | Per-party tone reads (`overall`, `descriptors`, `notes`). |

Allowed headline labels include `professional`, `friendly`, `tense`, `urgent`, `supportive`, `transactional`, `escalated`, `empathetic`, `terse`, `playful`, `confrontational`, `informational`, `casual`, `formal-business`, `conversational`.

## Action item extraction

After analysis succeeds, `CallPersistenceService.applyAnalysisSideEffects` walks `actionItems[]` and inserts a row per item into `action_items`. Owner fields are resolved through `ActionItemOwnerMapper` and double-checked against `transcript.speakers[]`:

| LLM output | Used directly? | Cross-checked? |
|---|---|---|
| `ownerSpeakerId` | Preferred | Verified to exist in `speakers[]`. |
| `ownerSpeakerLabel` | Used if id missing | Matched (case-insensitive) against labels and display names. |
| `ownerDisplayName` | Used if neither above | Populated from the resolved speaker. |
| `ownerRole` | Used directly | Filled in from the resolved speaker if absent. |

The mapper **never invents** an owner — if the LLM is vague and no transcript speaker matches, the row carries null owner fields. The raw `ownerSpeaker` string is preserved for forensic debugging.

### Intent classification (v2 additive)

Each action item now carries a provider-neutral **`intent`** and optional **`intentMetadata`**. This is the contract between the LLM and the client for launcher chips:

| `intent` | Meaning |
|---|---|
| `meeting` | Schedule a video / phone meeting |
| `email` | Send / draft an email |
| `call` | Phone the contact back |
| `message` | Send a chat / SMS |
| `reminder` | Self-reminder |
| `task` | Track in a task system |
| `none` | No launchable intent |

The backend **classifies**; the client **launches**. The server never constructs deep links or knows which apps the user has installed. When the transcript was explicit ("let's hop on Zoom"), the LLM may set `intentMetadata.providerHint` — a reordering hint for the client's chip list, not a binding choice.

`intent` and `intentMetadata` are persisted to Postgres (`action_items.intent`, `action_items.intent_metadata_json`) and surfaced on both `GET /api/actions` and `GET /api/calls/{id}/analysis`. Older rows have null intent — no chips rendered.

See [API · Action items](../api/action-items.md#intent-classification) for the full metadata field reference and client integration notes.

`executiveSummaryBullets`, `keyDiscussionPoints`, `sentiment`, and `tone` are **not** denormalised to Postgres. They live in the analysis JSON artifact only.

## Failure handling

- Hard fail on LLM 4xx (e.g. content policy block, invalid key). Call moves to `FAILED`.
- Retry once on network / 5xx.
- Soft fail on action-item extraction — transcript and analysis still ship.

## Idempotency

Re-running analysis (e.g. after a prompt change) is safe:

- `ANALYSIS_JSON` is overwritten in place. The artifact stays the *raw LLM bytes*, not Jackson's re-serialization, so the original wire format is preserved verbatim.
- Action items are deleted-then-reinserted for the call — no duplicate rows on reprocess.

## Telemetry

- `scryon.analysis.duration{provider="openai"}` — timer.
- `scryon.analysis.cost.tokens{type="prompt|completion"}` — counter (when the provider returns usage info).
- `scryon.action_items.extracted` — counter (per call).
- `event=PIPELINE stage=ANALYZED status=COMPLETED durationMs=... tokens=...`

## Privacy

- The LLM provider receives the transcript text. Choose a provider that meets your data residency requirements.
- The prompt does **not** include phone numbers, emails, the user's `externalUserId`, contact name, or any field beyond what's required for the analysis.
- Set `LLM_TEMPERATURE=0.2` (default) to keep outputs deterministic-ish; raise carefully.
- Sentiment and tone scores must be grounded in the transcript. The prompt explicitly tells the model to prefer `unclear` and lower magnitudes when in doubt.

## Code map

| Concern | File |
|---|---|
| Provider interface | `AnalysisClient` |
| OpenAI implementation | `OpenAiAnalysisClient` |
| Prompt builder + schema enforcement | `AnalysisPrompt` |
| Output DTO (records) | `ScryonAnalysis` (in `com.scryon.analysis.dto`) |
| Pipeline orchestrator | `CallProcessingService.finishPipelineAfterTranscript` |
| Postgres side effects + action items | `CallPersistenceService.applyAnalysisSideEffects` |
| Owner reconciliation | `ActionItemOwnerMapper` |
| `GET /analysis` adapter | `CallAnalysisResolver` (legacy aliases) |
| Endpoint | `CallController#analysis` |

## Tests to look at

| Test | What it covers |
|---|---|
| `ScryonAnalysisV2SchemaTest` | Round-trip of all v2 fields + v1 backward compat. |
| `CallAnalysisResolverTest` | Legacy alias generation + v2 pass-through. |
| `AnalysisPipelineActionItemsTest` | End-to-end pipeline with a mocked LLM. |
| `CallArtifactEndpointTest` | `GET /analysis` legacy aliases from stored artifact. |

# LLM analysis

The analysis stage turns a normalised transcript into a structured business summary: title, executive summary, action items, key points, sentiment, topics, decisions, risks, objections, and follow-ups.

> **Provider.** OpenAI by default (`LLM_PROVIDER=openai`). Any OpenAI-compatible endpoint works.

## What the LLM receives

`AnalysisPrompt` builds a prompt that includes:

- A short system message defining the output schema.
- The normalised transcript with stable `seg_NNNN` IDs and resolved speaker names.
- A compact, non-PII metadata block (`callId`, language, duration).

The transcript is **post-resolution** — by the time it reaches the LLM, speakers are named where evidence allowed, and IDs are stable. This means the LLM can cite `Praveen said X (seg_0002)` without inventing names.

## What we get back

The model returns a JSON object that strictly matches `ScryonAnalysis`. The key fields:

| Field | Meaning |
|---|---|
| `category` | Sales / support / personal / etc. |
| `title` | A short headline. |
| `oneLineSummary` | Single sentence. |
| `executiveSummary` | A paragraph. |
| `outcome` | What was decided. |
| `sections[]` | Open-ended groupings with `kind` tag. |
| `actionItems[]` | Owner + due date + priority + provenance. |
| `keyPoints[]` | Bullets. |
| `decisions[]`, `risks[]`, `objections[]`, `questions[]`, `followUps[]` | Lists. |
| `topics[]`, `sentiment` | Tags. |

The model is forced to **cite source segment IDs** for action items — that's how `ActionItemOwnerMapper` reconciles owner fields without re-deriving them from text.

## Action item extraction

After analysis succeeds, `ActionItemService` walks the `actionItems[]` array and inserts a row per item into `action_items`. The owner fields are resolved from the LLM output and double-checked against `transcript.speakers[]`:

| LLM output | Used directly? | Cross-checked? |
|---|---|---|
| `ownerSpeakerId` | Preferred | Verified to exist in `speakers[]`. |
| `ownerSpeakerLabel` | Used if `id` missing | Matched (case-insensitive) against labels and display names. |
| `ownerDisplayName` | Used if neither above | Populated from the resolved speaker. |
| `ownerRole` | Used directly | Filled in from the resolved speaker if absent. |

The mapper **never invents** an owner — if the LLM is vague and no transcript speaker matches, the action item ships with null owner fields and the row carries the raw `ownerSpeaker` string for forensic debugging.

## Failure handling

- Hard fail on LLM 4xx (e.g. content policy block, invalid key). Call moves to `FAILED`.
- Retry once on network / 5xx.
- Soft fail on action-item extraction (transcript and analysis still ship).

## Idempotency

Re-running analysis (e.g. after changing the prompt) is safe:

- `ANALYSIS_JSON` is overwritten in place.
- `ActionItemService` deletes existing items for the call before inserting fresh ones. Each row is dedup'd by `(call_id, title, due_date)`.

## Telemetry

- `scryon.analysis.duration{provider="openai"}` — timer.
- `scryon.analysis.cost.tokens{type="prompt|completion"}` — counter (when the provider returns usage info).
- `scryon.action_items.extracted` — counter (per call).
- `event=PIPELINE stage=ANALYZED status=COMPLETED durationMs=... tokens=...`

## Privacy

- The LLM provider receives the transcript text. Choose a provider that meets your data residency requirements.
- The prompt does **not** include phone numbers, emails, the user's `externalUserId`, or any field beyond what's required for the analysis.
- Set `LLM_TEMPERATURE=0.2` (default) to keep outputs deterministic-ish; raise carefully.

## Code map

| Service | File |
|---|---|
| `AnalysisClient` | Provider interface. |
| `OpenAiAnalysisClient` | Implementation. |
| `AnalysisPrompt` | Prompt builder + JSON-schema enforcement. |
| `ScryonAnalysis` | Output DTO. |
| `ActionItemService` | Persistence + dedup. |
| `ActionItemOwnerMapper` | Owner-field reconciliation. |
| `CallAnalysisResolver` | GET `/analysis` endpoint. |

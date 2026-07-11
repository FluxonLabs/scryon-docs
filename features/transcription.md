# Transcription

Scryon transcribes call audio with **Lemonfox** (a Whisper-compatible provider).
The verbatim provider response is stored for audit and reprocessing, then a
deterministic normalization step turns it into the stable transcript clients
consume.

## Request

`POST /audio/transcriptions` (multipart), with:

| Part | Value | Why |
|------|-------|-----|
| `file` | preprocessed audio | mono / 16 kHz / loudnorm (+ denoise) — see [Audio preprocessing](audio-preprocessing.md) |
| `model` | e.g. `whisper-1` | configurable |
| `response_format` | `verbose_json` | required for segments, word timestamps, and speaker labels |
| `speaker_labels` | `true` | Lemonfox's built-in diarization toggle (**not** `diarization`) |
| `timestamp_granularities[]` | `word` **and** `segment` | word timings drive alignment against diarization turns |
| `task` | `transcribe` | never translate |
| `language` | optional | omitted → auto-detect |
| `callback_url` | signed URL | async mode only (see below) |

{% hint style="warning" %}
The diarization toggle is `speaker_labels`, not `diarization`. The wrong key is
silently ignored and every segment comes back with `speaker: null`, collapsing
the call to one speaker. See [Diarization](diarization.md).
{% endhint %}

## Async (callback) vs sync

- **Async** — submit with a signed `callback_url`; Lemonfox POSTs the verbose
  transcript back to `/api/webhooks/lemonfox/{callId}` when done. The webhook is
  authenticated by HMAC and is idempotent on retries.
- **Sync** — a fallback that blocks for the response inline (dev/CI, or when
  callbacks are disabled).

Both feed the same normalization path.

## From provider JSON to the Scryon transcript

1. **`RAW_TRANSCRIPT_JSON`** — the verbatim Lemonfox response, stored as-is
   (audit + reprocessing). Clients never see this shape.
2. **Normalization** (deterministic, no LLM) — drops empty segments, collapses
   Whisper stutter/repetition, fixes tiny overlaps, deduplicates near-duplicates,
   merges adjacent same-speaker turns, splits oversized single-speaker turns into
   readable bubbles, canonicalises speaker labels to stable `spk_N` ids, and
   assigns `seg_NNNN` ids.
3. **`NORMALIZED_TRANSCRIPT_JSON`** — the result, and **the only shape mobile
   clients see** (via `GET /api/calls/{id}/transcript`).

Word- and segment-level timestamps from the provider are what let
[Diarization](diarization.md) turns be aligned precisely in the next stage; see
[Speaker resolution](speaker-resolution.md) for what happens after.

## Code map

| Concern | Class |
|---------|-------|
| Provider client | `com.scryon.transcription.LemonfoxTranscriptionClient` |
| Verbose response DTOs | `com.scryon.transcription.dto.LemonfoxVerboseResponse`, `LemonfoxSegment`, `LemonfoxWord` |
| Callback webhook | `com.scryon.transcription.callback.LemonfoxWebhookController` |
| Normalization | `com.scryon.transcription.normalize.TranscriptNormalizationService` |

See also: [Diarization](diarization.md) · [Speaker resolution](speaker-resolution.md) ·
[API › Transcripts](../api-reference/transcripts.md).

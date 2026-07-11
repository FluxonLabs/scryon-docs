# Call processing pipeline

The end-to-end journey of one call, from uploaded audio to a named transcript
with a structured analysis and action items. Orchestrated by
`com.scryon.calls.CallProcessingService`.

## Stages

```
POST /api/calls/analyze  (202 Accepted)
        │
        ▼
[1] Store audio            TEMP_AUDIO artifact (short-lived)
[2] Preprocess audio       two variants: transcription (denoised) + diarization (clean)
[3] Diarize                pyannote → speaker turns (fallback: Lemonfox speaker_labels)
[4] Submit transcription   Lemonfox verbose_json  ── async (callback) or sync (fallback)
        │  (callback arrives)
        ▼
[5] Align                  words/segments ↔ diarization turns
[6] Normalize              stable spk_N ids, clean/dedupe/merge, split oversized turns
        │                    → RAW_TRANSCRIPT_JSON + NORMALIZED_TRANSCRIPT_JSON
[7] Voice match            pre-label USER from enrolled voiceprint (optional)
[8] Resolve speakers       deterministic naming rules
[9] LLM naming             constrained, grounded (optional)
[10] Analyze               LLM → open-ended analysis → ANALYSIS_JSON
[11] Action items          extracted into Postgres rows
        ▼
     COMPLETED
```

Stages 5–9 are the shared `buildAndRefineTranscript` path — see
[Speaker resolution](../features/speaker-resolution.md) for 5–9 in detail and
[Diarization](../features/diarization.md) for 3.

## Callback vs synchronous

Transcription is normally **asynchronous**: the worker submits the audio to
Lemonfox with a signed `callback_url`, returns immediately, and the rest of the
pipeline resumes when Lemonfox POSTs the verbatim transcript back to the webhook
(`resumeFromCallback`). The diarization result computed before submit is
persisted (`DIARIZATION_RESULT_STATE`) so it survives a restart between submit
and callback.

A **synchronous** fallback (`runPipeline`) runs the whole thing inline — used in
dev/CI and when callbacks are disabled. Both paths call the same
`buildAndRefineTranscript` and `finishPipelineAfterTranscript`, so they produce
identical output for identical input.

## Status model

`analyze` returns `202` immediately; clients poll `/api/calls/status`. A call
moves `TRANSCRIBING → ANALYZING → COMPLETED`, or `FAILED`. See
[Status lifecycle](../android-client/status-lifecycle.md).

## Artifacts written

| Artifact | When | Retained |
|----------|------|----------|
| `TEMP_AUDIO` | on upload | **No** — deleted at COMPLETED/FAILED (24h sweeper backs up crashes) |
| `DIARIZATION_JSON` | diarization completes (pyannote) | Yes |
| `RAW_TRANSCRIPT_JSON` | transcript received | Yes |
| `NORMALIZED_TRANSCRIPT_JSON` | normalization | Yes — the shape clients see |
| `ANALYSIS_JSON` | analysis | Yes |

Because audio is not retained, reprocessing works from the stored raw outputs
(see reanalyze below), not from the original audio.

## Reprocessing

The `reanalyze` endpoint (dev/staging) rebuilds the normalized transcript from
`RAW_TRANSCRIPT_JSON` + `DIARIZATION_JSON` and re-runs stages 5–11 with the
current code — no new provider calls. It cannot re-transcribe or re-diarize from
scratch (no audio); a call that never captured pyannote must be re-imported. See
[Speaker resolution › Reprocessing](../features/speaker-resolution.md#reprocessing-existing-calls).

## Guarantees

- **Diarization never fails a call** — any pyannote error/skip falls back to the
  transcription provider's labels.
- **Naming never fails a call** — voice match and LLM naming are best-effort;
  failures leave the deterministic transcript intact.
- The two entry paths (callback / sync) are behaviourally identical.

## Code map

| Concern | Class |
|---------|-------|
| Orchestration | `com.scryon.calls.CallProcessingService` |
| Webhook resume | `com.scryon.transcription.callback.LemonfoxWebhookController` |
| Audio preprocessing | `com.scryon.calls.audio.AudioPreprocessingService` |

See also: [System overview](system-overview.md) · [Storage layout](storage-layout.md) ·
[Transcription](../features/transcription.md).

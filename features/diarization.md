# Diarization

Diarization is the process of figuring out **who spoke when** — a stream of `(start, end, speakerId)` turns. Scryon uses [pyannoteAI](https://pyannote.ai) for high-quality diarization, with Lemonfox's built-in diarization as a graceful fallback.

> **Feature flag.** `PYANNOTE_ENABLED=true` enables pyannote diarization. When off, only Lemonfox diarization is used.

## How it works

```
┌───────────────────┐  presigned PUT  ┌──────────────────┐
│  Scryon backend   │ ───────────────▶│  pyannote media  │
│ (worker thread)   │ ◀───── jobId ── │     storage      │
└────────┬──────────┘                 └──────────────────┘
         │ POST /v1/diarize {url, numSpeakers}
         ▼
┌───────────────────┐  poll  ┌──────────────────┐
│  pyannote API     │ ◀───── │  /v1/jobs/{id}    │
└───────────────────┘        └──────────────────┘
         │  COMPLETED
         ▼
   diarization turns
```

1. The preprocessed audio is uploaded to pyannote's media store via a presigned URL.
2. A diarize job is created. For phone calls (`direction = INCOMING` / `OUTGOING`) Scryon hints `numSpeakers: 2` to prevent over-segmentation.
3. The worker polls `/v1/jobs/{id}` every `SCRYON_DIARIZATION_POLL_INTERVAL_SECONDS` until terminal.
4. The completed turns become the input to `TranscriptAlignmentService`.

## Why pyannote (and what happens if it fails)

| Property | pyannote | Lemonfox built-in |
|---|---|---|
| Accuracy on phone audio | **High** | Medium |
| Word-level alignment compatibility | Yes (via overlap matching) | Segment-level only |
| Multilingual support | Strong | Tied to Whisper's diarization |
| Cost | Per-minute | Bundled |
| Failure mode | Falls back to Lemonfox | None — already the fallback |

If pyannote fails (network, quota, malformed audio), the pipeline emits `event=PIPELINE stage=PYANNOTE_FAILED_FALLBACK` and proceeds with Lemonfox diarization. **The call never fails because pyannote is unreachable.**

## The 2-speaker hint

The most common pyannote failure mode is over-segmentation: background noise or HVAC rumble gets classified as a third or fourth speaker. Two complementary fixes are applied:

1. **Audio denoising before diarization** — see [Audio preprocessing](audio-preprocessing.md).
2. **`numSpeakers: 2` hint** for phone calls, gated by `SCRYON_DIARIZATION_HINT_TWO_SPEAKERS` (default true). The hint is only sent when `direction` is `INCOMING` or `OUTGOING` — manual uploads (no direction) keep the unconstrained behaviour.

## Audio length guard

`SCRYON_DIARIZATION_MAX_AUDIO_MINUTES` (default 30) skips pyannote for calls longer than the threshold (cost + latency control). Long calls fall back to Lemonfox diarization automatically.

## Retries

Network errors and 5xx responses are retried up to `SCRYON_DIARIZATION_MAX_RETRIES` times. 4xx errors (auth, quota, bad request) **do not retry** — they bubble up and trigger the fallback.

## Privacy

- Audio is uploaded to pyannote via presigned PUT and is governed by pyannote's retention policy (currently 48h).
- We never log the raw turns. The `DIARIZATION_JSON` artifact in object storage is owner-scoped and only fetchable via authenticated APIs.

## Code map

| Service | File |
|---|---|
| `DiarizationService` | Orchestration. |
| `PyannoteDiarizationClient` | HTTP integration. |
| `DiarizationClient` | Interface (also implemented by `DisabledDiarizationClient`). |
| `TranscriptAlignmentService` | Consumes the turns. |

## Telemetry

Metrics:

- `scryon.diarization.duration{provider="pyannote"}`
- `scryon.diarization.fallback{reason="..."}`

Logs:

- `event=PIPELINE stage=PYANNOTE_STARTED ...`
- `event=PIPELINE stage=PYANNOTE_FAILED_FALLBACK reason=...`
- `event=PIPELINE stage=DIARIZED status=COMPLETED ...`

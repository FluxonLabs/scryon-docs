# Transcription

Transcription turns audio into text. Scryon delegates to [Lemonfox](https://lemonfox.ai), which provides a Whisper-compatible API with word-level timestamps.

## How it works

The transcription client receives the **preprocessed** audio (mono, 16 kHz, loudness-normalised, denoised) and sends it to Lemonfox with these parameters:

| Parameter | Source | Notes |
|---|---|---|
| `model` | `LEMONFOX_MODEL` | Default `whisper-1`. |
| `language` | `LEMONFOX_LANGUAGE` or autodetect | ISO-639-1. |
| `response_format` | `verbose_json` | Always — we need word timestamps. |
| `timestamp_granularities` | `["word"]` | For alignment with diarization. |

The response is a `LemonfoxVerboseResponse` with per-segment text, per-word timing, and optional speaker labels (we ignore these in favour of pyannote).

## Word-level alignment

Word timestamps are the input to `TranscriptAlignmentService`, which maps each word to the diarization turn it overlaps with the most. Without word-level data the alignment falls back to segment-level matching — still functional, but noticeably worse on cross-talk.

## Modes

### Synchronous (default)

The worker blocks on the transcription HTTP call. Simple, safe, easy to debug. Used everywhere by default.

### Callback (opt-in)

When `SCRYON_TRANSCRIPTION_CALLBACK_ENABLED=true` the worker submits the audio with a signed callback URL and releases its thread. Lemonfox POSTs the verbose transcript to:

```
POST {SCRYON_PUBLIC_BASE_URL}/api/webhooks/lemonfox?callId=...&sig=...
```

The signature is HMAC-SHA256 over the query string, using `SCRYON_WEBHOOK_SECRET`. Stale callbacks (older than `SCRYON_TRANSCRIPTION_CALLBACK_TIMEOUT_MINUTES`) are reaped by `StaleJobSweeper`.

Use the callback mode when:

- Calls are long (≥ 10 minutes) and tying up worker threads is wasteful.
- You're deployed behind a proxy that allows inbound webhook traffic.

## Errors

| Failure | Behaviour |
|---|---|
| Network / 5xx | Retried by the underlying `WebClient` (default 1 retry). |
| 4xx | Hard fail — the call moves to `FAILED` with `error_code=transcription_4xx`. |
| Timeout (`LEMONFOX_TIMEOUT_SECONDS`) | Hard fail. |
| Empty response | Hard fail. The call is marked `FAILED`. |

There is no fallback transcription provider today. If Lemonfox is unreachable, calls fail.

## Tuning

| Knob | Effect |
|---|---|
| `LEMONFOX_LANGUAGE` | Setting an explicit language hint reduces hallucinations on short clips. Use `en` for Indian English. |
| `LEMONFOX_MODEL` | Try `whisper-large-v3` for higher accuracy when latency is acceptable. |
| Audio denoising | See [Audio preprocessing](audio-preprocessing.md) — heavy denoise can clip quiet speech. |

## Privacy

- The raw verbose JSON is stored as the `RAW_TRANSCRIPT_JSON` artifact for replay / debugging.
- Transcript text is redacted from `INFO` logs when `REDACT_TRANSCRIPTS=true`.

## Code map

| Service | File |
|---|---|
| `TranscriptionClient` | Interface. |
| `LemonfoxTranscriptionClient` | HTTP integration. |
| `LemonfoxWebhookController` | Callback handler. |
| `LemonfoxVerboseResponse` | DTO. |

## Telemetry

- `scryon.transcription.duration{provider="lemonfox"}`
- `event=PIPELINE stage=TRANSCRIBED status=COMPLETED durationMs=...`
- `event=PIPELINE stage=LEMONFOX_SUBMITTED status=STARTED` (callback mode only).

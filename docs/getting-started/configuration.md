# Configuration reference

Every Scryon configuration knob is an environment variable. They all have safe defaults so a vanilla `./mvnw spring-boot:run` works on a developer laptop. Production deployments override what they need.

The source of truth is `src/main/resources/application.yml` in `scryon-backend`.

## Core

| Variable | Default | Notes |
|---|---|---|
| `SERVER_PORT` | `8080` | HTTP listener port. |
| `DB_URL` | `jdbc:postgresql://localhost:5432/scryon` | JDBC URL. |
| `DB_USERNAME` | `scryon` | DB user. |
| `DB_PASSWORD` | `scryon` | DB password. |
| `FLYWAY_ENABLED` | `true` | Set to `false` only for the H2 test profile. |
| `MAX_FILE_SIZE` | `50MB` | Hard cap per uploaded recording. |
| `MAX_REQUEST_SIZE` | `55MB` | `MAX_FILE_SIZE` + room for the metadata envelope. |

## Security

| Variable | Default | Notes |
|---|---|---|
| `SCRYON_API_KEY` | `(empty)` | Optional shared-secret header. If unset the guard is off — local dev only. |
| `FIREBASE_PROJECT_ID` | `(empty)` | When set, every `/api/**` request needs a valid Firebase ID token. |
| `FIREBASE_CLIENT_EMAIL` | `(empty)` | Service-account client email — enables Admin SDK verification. Also the credential [push notifications](../features/push-notifications.md) reuse — no separate FCM config. |
| `FIREBASE_PRIVATE_KEY` | `(empty)` | PEM-encoded service-account private key. |
| `SCRYON_CORS_ALLOWED_ORIGINS` | `(empty)` | Comma-separated allowlist. Empty = no CORS headers. |

## Admin

| Variable | Default | Notes |
|---|---|---|
| `SCRYON_ADMIN_ALLOWED_EMAILS` | `(empty)` | Comma-separated, case-insensitive email allowlist. Empty = nobody is admin. See [Admin console](../admin/overview.md). |

## Observability

| Variable | Default | Notes |
|---|---|---|
| `SCRYON_OBSERVABILITY_ENABLED` | `true` | Master switch. |
| `SCRYON_REQUEST_LOGGING_ENABLED` | `true` | Structured HTTP access log. |
| `SCRYON_PIPELINE_LOGGING_ENABLED` | `true` | Per-stage `event=PIPELINE` log lines. |
| `SCRYON_DEBUG_ENDPOINTS_ENABLED` | `false` | Owner-scoped `/api/debug/calls/{id}/events`. |
| `SCRYON_TRACING_ENABLED` | `false` | Micrometer Observation spans. |
| `MANAGEMENT_TRACING_ENABLED` | `false` | Spring Boot tracing facade. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `(empty)` | OTLP collector URL. |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` | Trace sampling probability. |
| `SENTRY_DSN` | `(empty)` | Sentry project DSN. Empty = no events sent. |
| `SENTRY_ENVIRONMENT` | `local` | Tags Sentry events. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Sentry performance sampling. |
| `MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE` | `health,info,metrics,prometheus` | Actuator exposure list. |

## Privacy

| Variable | Default | Notes |
|---|---|---|
| `REDACT_TRANSCRIPTS` | `true` | Redact transcript text from `INFO` logs. |

> The hard rule "Scryon never persists raw audio" is enforced in code, not config. There is no env var to disable it.

## Transcription (Lemonfox)

| Variable | Default | Notes |
|---|---|---|
| `LEMONFOX_API_KEY` | `(empty)` | **Required.** |
| `LEMONFOX_BASE_URL` | `https://api.lemonfox.ai/v1` | Override for self-hosted. |
| `LEMONFOX_MODEL` | `whisper-1` | Whisper variant. |
| `LEMONFOX_LANGUAGE` | `(auto)` | ISO-639-1 hint. Empty = autodetect. |
| `LEMONFOX_TIMEOUT_SECONDS` | `180` | Per-request timeout. |
| `SCRYON_TRANSCRIPTION_CALLBACK_ENABLED` | `false` | Async webhook mode. |
| `SCRYON_PUBLIC_BASE_URL` | `(empty)` | Required when callback mode is on. |
| `SCRYON_WEBHOOK_SECRET` | `(empty)` | ≥ 32-byte HMAC secret for webhook URL signing. |
| `SCRYON_TRANSCRIPTION_CALLBACK_TIMEOUT_MINUTES` | `30` | Sweep stuck callbacks after this. |

## Diarization (pyannoteAI)

| Variable | Default | Notes |
|---|---|---|
| `PYANNOTE_ENABLED` | `false` | Master switch. Fallback to Lemonfox built-in diarization when off. |
| `PYANNOTE_API_KEY` | `(empty)` | Required when enabled. |
| `PYANNOTE_BASE_URL` | `https://api.pyannote.ai` | |
| `PYANNOTE_MODEL` | `precision-2` | |
| `SCRYON_DIARIZATION_TIMEOUT_SECONDS` | `300` | Polling deadline. |
| `SCRYON_DIARIZATION_POLL_INTERVAL_SECONDS` | `5` | Job poll cadence. |
| `SCRYON_DIARIZATION_MAX_RETRIES` | `2` | Network + 5xx retries. |
| `SCRYON_DIARIZATION_MAX_AUDIO_MINUTES` | `30` | Skip pyannote above this (cost/latency guard). |
| `SCRYON_DIARIZATION_HINT_TWO_SPEAKERS` | `true` | Send `numSpeakers: 2` for phone calls. |

## Voice embedding (opt-in)

| Variable | Default | Notes |
|---|---|---|
| `SCRYON_VOICE_EMBEDDING_ENABLED` | `false` | Master switch. APIs 404 when off. |
| `SCRYON_VOICE_EMBEDDING_PROVIDER` | `pyannote` | Reuses pyannote credentials. |
| `SCRYON_VOICE_EMBEDDING_HIGH_THRESHOLD` | `0.85` | Score ≥ ⇒ HIGH match. |
| `SCRYON_VOICE_EMBEDDING_MEDIUM_THRESHOLD` | `0.75` | Score ≥ ⇒ MEDIUM match. |
| `SCRYON_VOICE_SAMPLE_MIN_SECONDS` | `15` | Reject samples below. |
| `SCRYON_VOICE_SAMPLE_MAX_SECONDS` | `45` | Reject samples above. |
| `SCRYON_VOICE_SAMPLE_MAX_SIZE_MB` | `10` | Hard file-size cap. |
| `SCRYON_VOICE_CONSENT_VERSION` | `v1` | Bump to require re-consent. |

## Audio preprocessing

| Variable | Default | Notes |
|---|---|---|
| `SCRYON_AUDIO_PREPROCESSING_ENABLED` | `true` | Mono + 16 kHz + loudnorm pipeline. |
| `SCRYON_FFMPEG_PATH` | `ffmpeg` | Override for non-PATH installs. |
| `SCRYON_AUDIO_PREPROCESSING_OUTPUT_FORMAT` | `wav` | Output container. |
| `SCRYON_AUDIO_PREPROCESSING_TIMEOUT_SECONDS` | `60` | Per-file ffmpeg timeout. |
| `SCRYON_AUDIO_DENOISE_ENABLED` | `true` | High-pass + FFT denoise before loudnorm. |
| `SCRYON_AUDIO_HIGHPASS_HZ` | `80` | HVAC rumble cutoff. |
| `SCRYON_AUDIO_DENOISE_NR_DB` | `12` | Noise reduction strength (dB). |
| `SCRYON_AUDIO_DENOISE_NOISE_FLOOR_DB` | `-25` | Estimated noise floor. |

## LLM (analysis)

| Variable | Default | Notes |
|---|---|---|
| `LLM_PROVIDER` | `openai` | |
| `LLM_API_KEY` | `(empty)` | **Required.** |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | |
| `LLM_MODEL` | `gpt-4o-mini` | |
| `LLM_TIMEOUT_SECONDS` | `120` | |
| `LLM_TEMPERATURE` | `0.2` | |

## Object storage

| Variable | Default | Notes |
|---|---|---|
| `OBJECT_STORAGE_PROVIDER` | `local` | `local` or `s3`. |
| `OBJECT_STORAGE_BUCKET` | `(empty)` | S3 bucket name. |
| `OBJECT_STORAGE_ENDPOINT` | `(empty)` | S3-compatible endpoint URL. |
| `OBJECT_STORAGE_REGION` | `auto` | |
| `OBJECT_STORAGE_ACCESS_KEY` | `(empty)` | |
| `OBJECT_STORAGE_SECRET_KEY` | `(empty)` | |
| `OBJECT_STORAGE_PATH_STYLE_ACCESS` | `true` | Disable for path-aware AWS S3. |
| `OBJECT_STORAGE_LOCAL_PATH` | `./var/storage` | Used only when provider = `local`. |
| `OBJECT_STORAGE_TEMP_AUDIO_TTL_HOURS` | `24` | How long temp audio survives before sweep. |

## Plans & billing

> Unlike every other section on this page, these are **Java-code defaults** (`ScryonProperties.Plans`), not env vars — there's no `application.yml` entry wiring an `SCRYON_PLANS_*` variable to any of them today. Spring's relaxed binding would pick one up if it were added, but don't assume one exists just because the pattern elsewhere on this page suggests it. To change these values today, edit `ScryonProperties.Plans` and redeploy.

| Setting | Default | Notes |
|---|---|---|
| Free — minutes/month | `150` | |
| Free — transcripts/day | `3` | |
| Pro — price | `999` (cents) | |
| Pro — minutes/month | `1000` | |
| Pro — overage rate | `0.025` ($/min) | Tracked, never blocks. |
| Top-up SKUs | `topup_60min` / `topup_150min` / `topup_400min` | See [Plans & billing](../features/plans-and-billing.md) for the full grant/price table. |

Whether any of this is actually enforced is a separate, run-time switch — see `billing_enabled` under [Admin console](../admin/overview.md).

## Async / background jobs

| Variable | Default | Notes |
|---|---|---|
| `SCRYON_STALE_JOB_TIMEOUT_MINUTES` | `15` | Mark jobs FAILED after this. |
| `SCRYON_SWEEP_INTERVAL_MS` | `300000` | Sweeper period. |
| `SCRYON_SWEEP_INITIAL_DELAY_MS` | `60000` | Startup delay. |

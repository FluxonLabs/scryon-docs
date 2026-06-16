# Observability

Scryon ships a complete observability stack by default — structured logs, metrics, distributed tracing, and error tracking — all wired with privacy guards.

## Logs

Every log line carries an MDC-correlated context block:

```
INFO [reqId=87c3-5d3f userId=449b-cd2 callId=fa71-a20a] ... event=PIPELINE stage=PYANNOTE_STARTED ...
```

- **Correlation IDs.** `X-Request-Id` is honoured if supplied; otherwise generated. Propagated through async workers by `PipelineMdc`.
- **Key=value pairs** make the lines greppable and easy to parse with Loki / Datadog / CloudWatch.
- **Privacy.** `SafeLogSanitizer` redacts emails, phone numbers, and obvious PII. `REDACT_TRANSCRIPTS=true` strips transcript text from `INFO` logs.

### Pipeline events

`ProcessingEventLogger` emits one event per pipeline stage with `event=PIPELINE`, including:

| Field | Meaning |
|---|---|
| `stage` | E.g. `AUDIO_PREPROCESSED`, `DIARIZED`, `TRANSCRIBED`. |
| `status` | `STARTED` / `COMPLETED` / `FAILED` / `SKIPPED`. |
| `provider` | When applicable. |
| `durationMs` | Set on terminal events. |
| `errorCode` / `errorMessage` | Short opaque code + sanitized message. |

Events are also persisted to `call_processing_events` for the owner-scoped `/api/debug/calls/{callId}/events` endpoint (gated by `SCRYON_DEBUG_ENDPOINTS_ENABLED`).

## Metrics

`ScryonMetrics` exposes Micrometer counters and timers, scraped at `/actuator/prometheus`.

Selected metrics:

| Metric | Type | Tags |
|---|---|---|
| `scryon.calls.uploaded` | counter | `direction` |
| `scryon.calls.completed` | counter | — |
| `scryon.calls.failed` | counter | `reason` |
| `scryon.audio.preprocessing.duration` | timer | — |
| `scryon.diarization.duration` | timer | `provider` |
| `scryon.transcription.duration` | timer | `provider` |
| `scryon.transcript.alignment.duration` | timer | — |
| `scryon.transcript.normalization.duration` | timer | — |
| `scryon.analysis.duration` | timer | `provider` |
| `scryon.voice.profile.created` | counter | — |
| `scryon.voice.match.attempted` | counter | — |
| `scryon.voice.match.outcome` | counter | `outcome` |

## Distributed tracing

When `SCRYON_TRACING_ENABLED=true` and `MANAGEMENT_TRACING_ENABLED=true`, `PipelineObservations` wraps every stage in a Micrometer Observation that exports as an OpenTelemetry span via `OTEL_EXPORTER_OTLP_ENDPOINT`. Spans are nested under the request span and carry `callId` and `stage` attributes.

A typical trace for one call looks like:

```
[HTTP POST /api/calls/analyze]
  └─ [pipeline.run]
       ├─ [pipeline.audio_preprocess]
       ├─ [pipeline.diarize]
       │    └─ [http.client GET pyannote /v1/jobs]
       ├─ [pipeline.transcribe]
       │    └─ [http.client POST lemonfox /v1/audio/transcriptions]
       ├─ [pipeline.align]
       ├─ [pipeline.normalize]
       ├─ [pipeline.voice_match]
       ├─ [pipeline.speaker_resolve]
       └─ [pipeline.analyze]
            └─ [http.client POST openai /v1/chat/completions]
```

## Error tracking (Sentry)

When `SENTRY_DSN` is set, exceptions are captured by `ScryonErrorReporter` with:

- A privacy-safe `beforeSend` callback that strips request bodies and PII headers.
- `callId` and `userId` as tags.
- The pipeline stage as a fingerprint.

Sentry is **off** when `SENTRY_DSN` is empty — no events are sent. CI and local dev are silent by default.

## Health

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/health` | Public liveness check, returns `{status, version}`. | none |
| `GET /actuator/health` | Spring Boot health; details visible only when authorised. | per `MANAGEMENT_ENDPOINT_HEALTH_SHOW_DETAILS`. |
| `GET /actuator/info` | Build info. | per actuator exposure. |
| `GET /actuator/prometheus` | Metrics scrape. | per actuator exposure (restrict in production). |

## Operating recommendations

- **Always scrape Prometheus.** Even at a 30s cadence, the alerting headroom is invaluable.
- **Always set `SENTRY_DSN` in production.** The cost-to-value ratio of error capture is unbeatable.
- **Enable tracing during incidents only.** OTLP export is enabled by env var so you can flip it without a redeploy if your platform supports rolling env updates.
- **Cap actuator exposure.** In hostile networks, restrict `/actuator/prometheus` behind a reverse proxy.

See [Monitoring](../operations/monitoring.md) for production dashboards and alerts.

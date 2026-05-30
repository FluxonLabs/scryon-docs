# Monitoring

Scryon emits enough telemetry to run a small SLO programme out-of-the-box. This page gives concrete dashboards and alerts to start with.

## Health budget

| SLI | Target | Notes |
|---|---|---|
| Pipeline success rate | ≥ 99% | `1 - rate(scryon_calls_failed_total) / rate(scryon_calls_uploaded_total)` |
| Time-to-complete p95 | ≤ 60s for 5-minute calls | `histogram_quantile(0.95, scryon_pipeline_total_duration_seconds_bucket)` |
| HTTP error rate | < 1% 5xx | `rate(http_server_requests_seconds_count{status=~"5.."}) / rate(http_server_requests_seconds_count)` |
| Worker stuck rate | < 0.1% | `rate(scryon_calls_swept_total)` |

## Prometheus scrape

Point Prometheus / Grafana Cloud / Datadog at `/actuator/prometheus` on a 15-30s cadence.

Example Prometheus job:

```yaml
- job_name: scryon
  scrape_interval: 30s
  metrics_path: /actuator/prometheus
  static_configs:
    - targets: ["scryon.internal:8080"]
```

## Suggested dashboards

### 1. Pipeline overview

| Panel | Query |
|---|---|
| Calls per hour | `sum(rate(scryon_calls_uploaded_total[5m])) * 3600` |
| Pipeline success rate | `1 - rate(scryon_calls_failed_total[5m]) / rate(scryon_calls_uploaded_total[5m])` |
| p50 / p95 / p99 e2e duration | `histogram_quantile(0.5/0.95/0.99, sum by (le) (rate(scryon_pipeline_total_duration_seconds_bucket[5m])))` |
| Failed reasons | `topk(5, sum by (reason) (rate(scryon_calls_failed_total[5m])))` |

### 2. Stage breakdown

Per-stage timers (all are `*_duration_seconds`):

| Stage | Metric |
|---|---|
| Audio preprocessing | `scryon_audio_preprocessing_duration_seconds` |
| Diarization | `scryon_diarization_duration_seconds` |
| Transcription | `scryon_transcription_duration_seconds` |
| Alignment | `scryon_transcript_alignment_duration_seconds` |
| Normalization | `scryon_transcript_normalization_duration_seconds` |
| Voice match | `scryon_voice_embedding_provider_duration_seconds` |
| Analysis | `scryon_analysis_duration_seconds` |

Plot p50 / p95 of each as a stacked area to see where time goes.

### 3. Provider health

| Panel | Query |
|---|---|
| pyannote fallback rate | `rate(scryon_diarization_fallback_total[5m])` |
| Voice match outcomes | `sum by (outcome) (rate(scryon_voice_match_outcome_total[5m]))` |
| Lemonfox 4xx rate | `rate(http_client_requests_seconds_count{host="api.lemonfox.ai",status=~"4.."}[5m])` |
| OpenAI 429 rate | `rate(http_client_requests_seconds_count{host="api.openai.com",status="429"}[5m])` |

### 4. Voice profile usage

| Panel | Query |
|---|---|
| Profiles created (7d) | `increase(scryon_voice_profile_created_total[7d])` |
| Match outcomes by status | `sum by (outcome) (rate(scryon_voice_match_outcome_total[1h]))` |

## Suggested alerts

| Alert | Condition | Why |
|---|---|---|
| Pipeline failure spike | `rate(scryon_calls_failed_total[5m]) > 0.1` | More than 10% failure over 5 min. |
| All calls failing | `rate(scryon_calls_failed_total[2m]) > 0 AND rate(scryon_calls_completed_total[2m]) == 0` | Total outage. |
| Stuck jobs | `rate(scryon_calls_swept_total[15m]) > 0` | Sweeper had to clean up — investigate. |
| Sentry rate | external | Sentry's own alerting. |
| Voice match always ambiguous | `rate(scryon_voice_match_outcome_total{outcome="ambiguous"}[1h]) / rate(scryon_voice_match_attempted_total[1h]) > 0.5` | Profile probably stale or low-quality. |
| Lemonfox 5xx | `rate(http_client_requests_seconds_count{host="api.lemonfox.ai",status=~"5.."}[5m]) > 0.05` | Provider degraded. |

## Logs

Recommend shipping logs via stdout to your platform's collector. Useful filters:

| Filter | Query |
|---|---|
| All pipeline events for a call | `event=PIPELINE callId=f0a1d2e3-...` |
| Failed stages | `event=PIPELINE status=FAILED` |
| Voice match | `event=VOICE_MATCH_*` |
| Speaker resolution | `event=SPEAKER_RESOLUTION` |
| HTTP request access log | `event=HTTP_REQUEST_COMPLETED` |

## Sentry

When `SENTRY_DSN` is set, Sentry receives:

- Every unhandled exception in HTTP handlers.
- Every pipeline-stage `RuntimeException` (`ScryonErrorReporter`).
- Scrubbed: request bodies, sensitive headers, transcript text.

Alert recommendations in Sentry:

- New issue notification (immediate).
- Spike: > 50 events / hour on any release.
- Release health degraded: crash-free sessions < 99%.

## Synthetic checks

A 1-minute synthetic check from your favourite tool:

```bash
curl -sf https://api.scryon.app/api/health > /dev/null
```

For a deeper probe, run a daily end-to-end test that uploads a 30-second fixture call against a `staging` Firebase project and asserts the analysis comes back.

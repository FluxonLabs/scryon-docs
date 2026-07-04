# Glossary

The vocabulary you will hear in PR review, design docs, and the on-call channel. Skim it once; come back as needed.

## Product & domain

| Term | Meaning |
|---|---|
| **Call** | One recorded phone conversation. The smallest unit of work in Scryon. Has a stable `callId`. |
| **Call record** | The Postgres row in `call_records` representing a call's metadata and lifecycle state. |
| **Call artifact** | A derived file produced by the pipeline (preprocessed audio, raw transcript, normalised transcript, analysis JSON). Stored in object storage. |
| **Action item** | A discrete, launchable TODO extracted from a call's analysis (or created manually). Has `title`, `owner*`, optional `dueDate`/`priority`, `status` (`OPEN` / `IN_PROGRESS` / `DONE` / `DISMISSED` — renamed from the old `PENDING` / `COMPLETED` in migration V19), `source` (`AI` / `MANUAL`), an `intent`, and `sourceSegmentIds`. Distinct from a **next step** (below). |
| **Next step** | A planned, forward-looking statement a speaker made ("I'll do X tomorrow") — split out from action items so the Actions list isn't cluttered with things that aren't really launchable tasks. Not persisted to Postgres; lives only in the analysis JSON's `nextSteps[]`. |
| **Direction** | `INCOMING` / `OUTGOING` / `UNKNOWN`. Influences default speaker resolution. |
| **USER / CONTACT** (speaker role) | The two `role` values for a real speaker. USER = the owner of the phone (the Scryon user). CONTACT = the other party. Not to be confused with **Scryon contact**, below. |
| **Scryon contact** | A row in the `contacts` table — a lightweight, user-owned address-book entry, separate from the Android device's system contacts. Auto-assigned to a call from the call-log `contactName` at upload time (matched by name), or linked manually via `PATCH /api/calls/{callId}/contact`. |

## Pipeline stages

| Term | Meaning |
|---|---|
| **Preprocessing** | ffmpeg pass: mono, 16 kHz, loudness-normalise, high-pass filter, optional `afftdn` denoise. |
| **Diarization** | "Who spoke when." Produces `[speakerId, t0, t1]` segments. Provider: pyannoteAI. |
| **Transcription** | "What was said." Produces `[word, startMs, endMs]`. Provider: Lemonfox / Whisper. |
| **Alignment** | Stitches diarization segments and transcription words into `[{speakerId, text, t0, t1}]`. |
| **Normalisation** | Produces our stable, versioned transcript schema (`v3`). The client never sees raw provider output. |
| **Speaker resolution** | Mapping anonymous `speaker_0` / `speaker_1` to `role` + `displayName` using layered evidence. |
| **Analysis** | LLM step: summary, detailed summary, key points, sentiment, action items. |
| **Action item extraction** | Persisting analysis action items as `action_items` rows with stable owners. |

## Speaker resolution vocabulary

| Term | Meaning |
|---|---|
| **LabelSource** | Enum recording *why* we picked a label: `VOICE_EMBEDDING`, `GREETING_MATCH`, `MENTION_ASYMMETRY`, `BY_ELIMINATION`, `DIRECTION`, `PHONE_FALLBACK`, `POSITIONAL_FALLBACK`, `AMBIGUOUS`, `MANUAL`. |
| **Confidence** | `HIGH` / `MEDIUM` / `LOW`. Voice embedding and explicit greeting matches are `HIGH`; positional fallback is `LOW`. |
| **Greeting match** | Speaker introduces themselves in the first N seconds (e.g. *"Hi, this is Priya"*). |
| **Mention asymmetry** | Only one speaker mentions a candidate name; the other never does. |
| **By elimination** | If we are confident about one of two speakers, the other is set by elimination. |
| **Direction tiebreaker** | When direction is `INCOMING`, the first speaker is more likely USER; `OUTGOING` flips that. |
| **Positional fallback** | Last-resort heuristic for 2-speaker calls when no other evidence resolves anyone. Always `LOW` confidence. |
| **Voice profile** | An opt-in voice embedding for the current user. Used to mark a speaker as USER with `labelSource=VOICE_EMBEDDING`. |

## Backend stack

| Term | Meaning |
|---|---|
| **WebClient** | Spring's reactive HTTP client. Used for all external provider calls. |
| **Flyway** | Database migration tool. Migrations live in `db/migration/V<n>__*.sql`. |
| **MDC** | "Mapped Diagnostic Context." Per-request key/value pairs that appear on every log line. Carries `callId`, `userId`, `requestId`. |
| **Micrometer** | Spring's metrics façade. Backed by Prometheus in prod. |
| **OpenTelemetry / OTLP** | Distributed tracing. Spans cover every pipeline stage. |
| **Sentry** | Error tracking. Events are scrubbed for PII before send. |
| **AnalysisPipeline** | The orchestrator service that runs the stages above. Idempotent and resumable. |
| **CallIntakeService** | The boundary that turns an HTTP upload into a `call_records` row + queued pipeline run. |
| **Idempotency-Key** | UUID per upload target; backend dedupes for 24 h. |

## Android stack

| Term | Meaning |
|---|---|
| **CallRecordingScanner** | Heuristically classifies a `MediaStore.Audio` row as a call recording. |
| **CallUploadWorker** | The Hilt-injected `CoroutineWorker` that owns the durable upload critical path. Runs as a foreground service. |
| **CallUploadEnqueuer** | The single entry point that writes the queue store and enqueues the worker. |
| **InFlightUploadStore** | `callId ↔ mediaId` bindings for accepted-but-not-terminal uploads. |
| **IdempotencyKeyStore** | UUID per upload target, 24 h TTL, retained across worker retries. |
| **UploadQueueStore** | Recordings the user tapped Transcribe on that the backend has not yet accepted. Drives the synthetic "Uploading" row. |
| **DismissedCallStore** | Backend `callId`s the user cancelled mid-analysis. Excluded from polling. |
| **CallContentCache** | On-disk JSON cache of transcript + analysis for `COMPLETED` calls. Wiped on sign-out. |
| **FirebaseIdTokenProvider** | Singleton that caches the Bearer token (~50 min) and serialises fetches. |
| **AuthGate** | Compose composable that gates the app's main shell on `AuthRepository.state`. |

## Reliability & quality

| Term | Meaning |
|---|---|
| **Idempotent** | Doing it twice produces the same result. Applied to upload accept, pipeline stages, and worker retries. |
| **Foreground service** | An Android service with a persistent notification. Survives app kill. The upload worker promotes to one after ~4 s grace. |
| **Per-uid namespacing** | Every local store is keyed by Firebase `uid` so two accounts on one device cannot collide. |
| **Feature flag** | Env var (or backend flag) that gates a feature. Default off in dev. Examples: `PYANNOTE_ENABLED`, `SCRYON_VOICE_EMBEDDING_ENABLED`. |
| **Stub provider** | A non-network implementation of an external provider used in local dev and tests. |
| **Testcontainers** | Library that spins up real Postgres in tests. Used in backend service tests. |

## API conventions

| Term | Meaning |
|---|---|
| **`X-API-Key`** | Shared secret header on every backend request. |
| **`Authorization: Bearer <token>`** | Firebase ID token. Required on all endpoints except `/api/health`. |
| **`Idempotency-Key`** | UUID per upload. Backend dedupes for 24 h. |
| **`schemaVersion`** | Embedded in transcript JSON. We are on `2`; `3` is in design. |
| **`labelSource`** | Per-speaker field explaining how we picked the role/name. Plumbed end-to-end. |

## Privacy vocabulary

| Term | Meaning |
|---|---|
| **PII** | Personally identifiable information. Names, phone numbers, transcript text, audio. |
| **Masking** | Reducing PII to a safe representation. Phone numbers become `+91 98***45` in logs. |
| **Scrubber** | Sentry's pre-send filter that drops PII fields from exception payloads. |
| **Hard delete** | No soft-delete window. Row, artifacts, and embeddings are gone immediately. |
| **Opt-in** | Off by default. The user must explicitly enable it. Voice profile, call-log enrichment, notifications. |

## Acronyms

| Term | Meaning |
|---|---|
| **ADR** | Architecture Decision Record. See the [template](../templates/adr.md). |
| **PR** | Pull request. |
| **DTO** | Data Transfer Object. The shape on the wire. Lives in `data/remote/dto/`. |
| **VM** | ViewModel (Android). |
| **JWT** | JSON Web Token. The Firebase ID token is a JWT. |
| **SLO / SLA** | Service Level Objective / Agreement. |

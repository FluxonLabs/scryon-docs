# Scryon Documentation

Welcome to the Scryon documentation. Scryon turns raw phone-call recordings into accurate, speaker-attributed transcripts and structured business insight — privately, reliably, and at production scale.

If you are new here, start with the [Overview](getting-started/overview.md) and then jump into the [Quickstart](getting-started/quickstart.md).

## What you'll find here

- **[Getting Started](getting-started/overview.md)** — what Scryon is, how to run it locally, the configuration surface, and a first end-to-end call.
- **[Architecture](architecture/system-overview.md)** — the call processing pipeline, data model, storage layout, and observability stack.
- **[API Reference](api/overview.md)** — every public REST endpoint, request/response shapes, error model, and authentication.
- **[Features](features/diarization.md)** — deep-dives on diarization, transcription, audio preprocessing, speaker resolution, voice embedding, and analysis.
- **[Operations](operations/deployment.md)** — deploying, monitoring, runbooks, and troubleshooting.
- **[Development](development/contributing.md)** — contributing guidelines, testing, conventions, and database migrations.
- **[Privacy & Security](privacy-and-security.md)** — what we store, what we never store, and the hard rules the codebase enforces.
- **[Templates](templates/feature.md)** — drop-in templates for new features, API endpoints, runbooks, ADRs, and post-mortems.

## Conventions in this documentation

- **Stability tags.** Features may be marked `stable`, `beta`, or `experimental`.
- **Feature flags.** Where a behaviour is gated by an environment variable, it is called out at the top of the page.
- **Privacy callouts.** Anything that touches user content (audio, transcripts, names, phone numbers) has an explicit privacy note.
- **Code references.** Backticks denote files, classes, and configuration keys (e.g. `SpeakerNameResolutionService`, `SCRYON_VOICE_EMBEDDING_ENABLED`).

## Project status

| Surface | Status |
|---|---|
| Call upload + async pipeline | Stable |
| Diarization (pyannoteAI) | Stable, opt-in via `PYANNOTE_ENABLED` |
| Transcription (Lemonfox / Whisper) | Stable |
| LLM analysis | Stable |
| Voice embedding / voice profile | Beta, opt-in via `SCRYON_VOICE_EMBEDDING_ENABLED` |
| Webhook callbacks for transcription | Beta, opt-in via `SCRYON_TRANSCRIPTION_CALLBACK_ENABLED` |
| Observability stack (Sentry, Prometheus, OTLP) | Stable |

## Where the source lives

| Repo | Purpose |
|---|---|
| [`scryon-backend`](https://github.com/FluxonLabs/scryon-backend) | Spring Boot service (Java 21). |
| [`scryon-docs`](https://github.com/FluxonLabs/scryon-docs) | This documentation site. |

> **GitBook setup.** This site is published to `docs.scryon.app` via GitBook Git Sync. See [GITBOOK_SETUP.md](GITBOOK_SETUP.md) for connecting your space and pointing the custom domain.

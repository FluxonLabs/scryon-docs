# Scryon

**Turn phone calls into trusted, structured memory.**

Scryon listens to the calls you already record, gives every voice a name, and pulls out the things that matter — decisions, action items, follow-ups, key dates — so the conversation keeps working for you long after the line goes dead.

> If you are a new engineer joining the team, start with the [Onboarding overview](onboarding/README.md). If you just want to use the docs, head to the [Getting started](getting-started/overview.md) section.

---

## The idea

A phone call is the highest-bandwidth medium most people use at work — and the most lossy. The moment it ends, the entire transcript lives in two human brains, decays within hours, and nothing it produced (a promise, a number, a date) can be searched, audited, or handed off.

Scryon is a small, focused service that fixes exactly that. You give it a recording; it gives you back:

- A **clean, speaker-attributed transcript** with `USER` vs `CONTACT` roles and real names.
- A **structured analysis** — short summary, detailed summary, key points, sentiment, **action items with owners and due dates**.
- A **stable artifact** that lives in your database, not in your head.

That's the whole product. Everything else in this codebase is in service of that loop being **accurate**, **private**, and **boringly reliable**.

---

## The problem we are solving

Today, every team has the same three options for a recorded call, and all of them are bad:

| Option | Why it fails |
|---|---|
| **"I'll remember it"** | The brain forgets nuance within a day. Promises drop. |
| **"I'll listen to it again later"** | A 30-minute call costs 30 minutes to replay. Nobody does it. |
| **"I'll send it to a generic transcription tool"** | You get a wall of text with `Speaker 1` and `Speaker 2`, no structure, no action items, and a privacy posture you can't audit. The recording sits on someone else's server forever. |

Sales, support, recruiting, journalism, legal, healthcare, founders doing customer interviews — they all hit the same wall. The information exists in the call; it just can't be acted on.

**The hard parts that everyone underestimates:**

1. **Diarization is not transcription.** "Who said what" is a separate, much harder problem than "what was said." Generic transcription services either skip it or do it badly.
2. **Speaker labels are not names.** `Speaker 1` is useless. Knowing that Speaker 1 is *Priya* (your customer) and Speaker 2 is *you* changes everything downstream — especially when an LLM extracts action items and needs to assign owners.
3. **Privacy is a contract, not a feature.** A recording of your call contains your contact's voice, their phone number, their words. Treating that as "just another upload" is unacceptable. You need hard rules, enforced in code, that you can point at.
4. **Reliability is a product feature.** Phone networks drop. Backgrounds OOM. Workers restart. If the user has to babysit an upload or reprocess a call after an outage, the product is broken.

---

## The solution

Scryon is built as a small Spring Boot service plus a native Android client. The service is **opinionated**, **single-tenant per user**, and **boring on purpose**.

### Backend, in one sentence

A Java 21 / Spring Boot service that accepts a multipart audio upload, runs an async pipeline (preprocess → diarize → transcribe → align → resolve speakers → analyse), and exposes a tight REST surface returning a normalised transcript, an analysis object, and a list of action items.

### Android client, in one sentence

A native Compose app that discovers call-style recordings already on the device, lets the user explicitly choose what to upload, runs durable WorkManager uploads that survive process death, and renders the result with real speaker names.

### What we deliberately do **not** do

- **We do not record calls.** The OS doesn't let us, the law often doesn't either, and the user shouldn't have to trust us with a microphone they didn't open. Scryon analyses recordings that already exist.
- **We do not train on your data.** Embeddings exist only to identify *you* as a speaker, opt-in, and only on your own profile.
- **We do not keep raw audio after processing.** Once the pipeline finishes, the audio is the user's to keep or delete; the database and storage hold derived artifacts (transcript JSON, analysis JSON) and nothing else.
- **We do not pretend to be a meeting bot.** Slack, Zoom, Meet — those are different products with different consent models.

---

## Vision

A year from now, when someone says *"the Priya call"* in a Slack channel, every person on the team — including the person who wasn't on the call, and the person who joined the company yesterday — should be able to:

1. **Find it in two seconds.** Search by name, phone number, or keyword.
2. **Trust what they read.** Speaker labels are right. Action items have owners. Nothing is invented.
3. **Act on it immediately.** The promise Priya made shows up as an action item with a due date, assigned to the right person.

Longer arc:

- **Multi-language.** English-first today; Hindi, Tamil, Telugu, Spanish next.
- **Real-time.** A live mode where the transcript and action items appear *during* the call, not after.
- **Open formats.** Export the transcript and analysis in standards everyone can consume — CRM systems, project trackers, helpdesks — without lock-in.
- **Open source where it makes sense.** The boring, valuable parts (the speaker-resolution heuristics, the privacy rules, the normalised transcript schema) should live in the open so the industry can stop solving them badly in twenty places.

We are not trying to be a *platform*. We are trying to make one thing — *phone calls become trustworthy structured memory* — work end-to-end, and work well.

---

## Core principles

These are the rules we apply when we disagree. They are intentionally small in number.

### 1. Privacy is non-negotiable

- **Raw audio is never persisted past the pipeline.** Storage holds derived artifacts only.
- **Voice embeddings are opt-in and bound to the user's own profile.** A user can never become a "speaker identification target" against their will.
- **Logs and metrics never carry PII.** Phone numbers are masked, transcript text never appears in metric labels, and Sentry events are scrubbed.
- **Deletion means deletion.** No soft-delete window for transcripts. No undo. When a user deletes a call, the row, the artifacts, and the embeddings are gone.

The codebase enforces these — see [Privacy & security](privacy-and-security.md). They are not aspirational.

### 2. Reliability is a product feature

- **Async, idempotent, resumable.** Every external boundary (uploads, provider calls, callbacks) is treated as flaky. Uploads carry an `Idempotency-Key`. Workers are restartable. State transitions are logged.
- **Foreground services on Android.** Uploads survive app kill and process death. The user starts the upload and walks away.
- **Boring infrastructure.** Postgres, S3-compatible storage, ffmpeg, Spring Boot. Nothing here is novel. The novelty is in the resolution heuristics and the contract with the user, not the stack.

### 3. Accuracy beats coverage

- **Diarization first, transcription second.** Knowing *who* spoke is more valuable than transcribing one more obscure word.
- **Refuse to guess.** When the evidence is ambiguous, `role=UNKNOWN` is correct. We never make up names.
- **Heuristics are layered, never stacked silently.** Each speaker label has a `labelSource` (greeting, voice match, mention asymmetry, positional fallback, …) so a human can audit *why* we said what we said.

### 4. The user is in control

- **Explicit upload.** Nothing auto-syncs. The user chooses what leaves their device.
- **Per-user namespacing.** Two accounts on one phone can never collide.
- **Opt-in features stay opt-in.** Voice profiles, call-log enrichment, notifications — each is off until the user turns it on, and the UI tells them what they unlock.

### 5. Boringly simple wins

- **Package by feature, not by layer.** A new contributor opens `calls/` and sees the controller, the service, the repository, the DTOs, and the pipeline stages — in one place.
- **No clever abstractions until we are bored of writing the same thing twice.**
- **Comments explain *why*, not *what*.** The code already says what.
- **Small services, sharp seams.** The backend does one thing. The Android app does one thing. They meet at a tight REST contract.

---

## How the docs are organised

| Section | For whom |
|---|---|
| **[Onboarding](onboarding/README.md)** | New engineers (backend or Android). Your first day, week, and month. |
| **[Getting Started](getting-started/overview.md)** | Anyone running Scryon locally or evaluating it. |
| **[Architecture](architecture/system-overview.md)** | Engineers and tech leads wanting to understand the pipeline. |
| **[API Reference](api/overview.md)** | Anyone integrating with the REST API. |
| **[Features](features/diarization.md)** | Deep dives on diarization, transcription, audio preprocessing, speaker resolution, voice embeddings, analysis. |
| **[Android Client](android/overview.md)** | Engineers working on the native Android app. |
| **[Dashboard](dashboard/overview.md)** | Engineers working on the web client / admin console. |
| **[Admin](admin/overview.md)** | Anyone operating the product day-to-day — feature flags, user management, account status. |
| **[Operations](operations/deployment.md)** | On-call engineers — deploy, monitor, run, troubleshoot. |
| **[Development](development/contributing.md)** | Contributing, testing, coding conventions, Flyway migrations. |
| **[Privacy & Security](privacy-and-security.md)** | The privacy contract, hard rules, threat model, GDPR. |
| **[Templates](templates/feature.md)** | Drop-in templates for features, API endpoints, runbooks, ADRs, post-mortems. |

## Conventions

- **Stability tags** — features may be marked `stable`, `beta`, or `experimental`.
- **Feature flags** — when a behaviour is gated by an environment variable, it is called out at the top of the page.
- **Privacy callouts** — anything that touches user content (audio, transcripts, names, phone numbers) has an explicit privacy note.
- **Code references** — backticks denote files, classes, and configuration keys (e.g. `SpeakerNameResolutionService`, `SCRYON_VOICE_EMBEDDING_ENABLED`).

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
| Plans & billing (Free/Pro tiers, top-ups) | Fully implemented, dark in production — opt-in via the admin console's `billing_enabled` flag |
| Admin console (feature flags, user management, account status, audit log) | Stable |

## Where the source lives

| Repo | Purpose |
|---|---|
| [`scryon-backend`](https://github.com/FluxonLabs/scryon-backend) | Spring Boot service (Java 21). |
| [`scryon-android`](https://github.com/FluxonLabs/scryon-android) | Native Android client (Kotlin + Compose). |
| [`scryon-dashboard`](https://github.com/FluxonLabs/scryon-dashboard) | Web client + admin console (Next.js). See [Dashboard overview](dashboard/overview.md). |
| [`scryon-docs`](https://github.com/FluxonLabs/scryon-docs) | This documentation site. |

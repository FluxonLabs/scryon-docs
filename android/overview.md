# Android client overview

Scryon's native Android app discovers call-style recordings already on the device, lets the user upload them on demand, polls the backend until they're transcribed and analysed, and renders the results.

> The app does **not** record calls itself. It only reads what already exists in `MediaStore` and what the user explicitly imports.

| | |
|---|---|
| **Backend** | `https://api.scryon.app/` (default) |
| **Auth** | Firebase Authentication — Email / Password, Google, Phone |
| **Min / Target SDK** | 26 / 35 |
| **Kotlin** | 2.0.0 |
| **AGP** | 8.7.3 |
| **Compose BOM** | 2024.04.01 |

## Tabs

Four bottom-bar tabs make up the app's surface:

| Tab | What it shows |
|---|---|
| **Calls** | A stats card + the untranscribed recordings discovered on the device. Each row has *Transcribe* / *Cancel*. The first Transcribe tap of the session prompts for `READ_CALL_LOG` (used for upload enrichment — uploads still work if denied). |
| **Transcribed** | Every call the backend knows about for the signed-in user, plus synthetic *Uploading* rows for in-flight uploads. Each row shows a status chip; in-flight rows expose a **Cancel upload / Cancel analysis** action. Tap a completed row to open detail. |
| **Actions** | All action items extracted from analyses (`GET /api/actions`), grouped *Pending → Completed*. Each row shows an **Assigned to** owner pill (CallLog name if available, else `Speaker N`, else USER/CONTACT), an optional due-date pill, and an *Open call* link. Tap to toggle status (writes `PATCH /api/actions/{id}`). |
| **Settings** | Account (edit name, sign out, delete), **Auth diagnostics** (Firebase uid + Bearer token preview / reveal / copy / force-refresh), backend info, notifications toggle, **call-log enrichment** state (with Re-ask / app-settings shortcut), privacy, theme, and the opt-in **Speaker recognition** card. |

Tapping a completed row opens a **Call detail** screen that loads `/api/calls/{id}` + `/transcript` + `/analysis` in parallel. Transcript bubbles render the refined speaker (CallLog name when available) annotated with **You** for the USER role; analysis tab bullets show **Assigned to …** lines.

## Tech stack

| Layer | Library |
|---|---|
| UI | Jetpack Compose + Material 3, custom "glass" theme |
| Nav | Compose Navigation |
| DI | Hilt 2.51.1 (with KSP) |
| Networking | Retrofit 2.11 + OkHttp 4.12 + Moshi 1.15 |
| Async | Kotlin Coroutines 1.9 + `kotlinx-coroutines-play-services` |
| Background | WorkManager 2.9 (`androidx.hilt:hilt-work` 1.2 + `lifecycle-process`) |
| Auth | Firebase BoM 33.7 (Auth) + Credential Manager 1.3 + Google ID library |
| Persistence | SharedPreferences (per-user-namespaced) |
| Build | Gradle Kotlin DSL + version catalog (`gradle/libs.versions.toml`) |

## Design principles

1. **The user explicitly chooses what to upload.** The app never auto-uploads anything; *Transcribe* is always a tap.
2. **Uploads are durable.** A tap on *Transcribe* enqueues a `WorkManager` job that survives app kill, swipe-from-recents, and process death.
3. **No raw audio on disk.** The app reads bytes from `MediaStore` and uploads them; nothing is copied into app-private storage.
4. **Per-user namespacing.** Every local store is keyed by Firebase `uid` so two accounts on one device can never collide.
5. **Compose first.** No XML layouts. Theme tokens live under `ui/theme` and are consumed via `LocalScryonColors.current`.

## What's next

- **[Getting started](getting-started.md)** — prerequisites, Firebase setup, first build.
- **[Architecture](architecture.md)** — layering and directory structure.
- **[Upload pipeline](upload-pipeline.md)** — how Transcribe goes from a tap to a completed analysis.

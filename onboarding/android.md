# Android onboarding

You are joining the team that owns the native Android client — the surface that 99% of our users actually see and touch. This page gets you from "git clone" to "first PR merged" in about a week.

> If you have not yet read the [Onboarding overview](README.md), start there. This page assumes you have the 30-minute mental model.

---

## What you are signing up for

The Android app's job, in one paragraph:

> Discover call-style recordings that already exist on the device. Let the user explicitly choose what to upload. Run **durable** uploads via WorkManager that survive app kill and process death. Poll the backend until the call reaches a terminal status. Render a clean transcript with real speaker names and a structured analysis. Never auto-upload anything. Never persist raw audio.

That is *the entire job*. The interesting design pressure is **reliability** — uploads must keep going while the user is on the metro with no signal, the app is swiped away, and the phone reboots. Everything else flows from that.

---

## The tech

| Layer | Choice | Notes |
|---|---|---|
| Language | **Kotlin 2.0** | Latest stable. We use coroutines aggressively, sealed types, and `value class` where it helps. |
| UI | **Jetpack Compose + Material 3** | No XML layouts. Custom "glass" theme in `ui/theme`. |
| Nav | Compose Navigation | String routes in `ui/navigation/ScryonRoutes.kt`. |
| DI | **Hilt 2.51** (with KSP) | All singletons live in `di/` modules. |
| Networking | **Retrofit 2.11 + OkHttp 4.12 + Moshi 1.15** | Interceptors centralised in `data/remote/`. |
| Async | Coroutines 1.9 + `kotlinx-coroutines-play-services` | `Tasks.await(...)` for Firebase. |
| Background | **WorkManager 2.9** + Hilt-Work + `lifecycle-process` | The upload critical path. |
| Auth | **Firebase BoM 33.7** (Auth) + Credential Manager 1.3 | Email / Google / Phone providers. |
| Persistence | `SharedPreferences` per-user-namespaced + on-disk JSON cache | No SQLite, no Room (yet). |
| Build | Gradle Kotlin DSL + version catalog (`gradle/libs.versions.toml`) | |

---

## Day 1 — get it running

### 1. Prereqs

- **Android Studio Hedgehog or newer**.
- **JDK 17** (Gradle uses JVM 11 target; JDK 17 runs Gradle fine).
- A **Firebase project** with Email/Password, Google, and Phone sign-in enabled.
- **Backend access** — at minimum a `SCRYON_API_KEY` for `https://api.scryon.app/`, or a locally-running backend.
- A device or emulator on **API 26+**.

### 2. Clone and configure

```bash
git clone git@github.com:FluxonLabs/scryon-android.git
cd scryon-android
```

Drop `google-services.json` into `app/` (gitignored). Create `local.properties` at the repo root and add:

```properties
SCRYON_BASE_URL=https://api.scryon.app/
SCRYON_API_KEY=<your-key>
FIREBASE_WEB_CLIENT_ID=<id>.apps.googleusercontent.com
```

The full list lives in [Android · Configuration](../android/configuration.md).

### 3. Build and run

```bash
./gradlew :app:installDebug
```

Or open in Android Studio → **Build → Rebuild Project**, then Run on a device or emulator.

> If you skip `google-services.json`, the app still builds — `AuthGate` renders LoginScreen with a "Firebase not configured" hint. Useful for UI-only changes.

### 4. End-to-end smoke test

1. Sign in (email, Google, or phone).
2. The first `GET /api/users/me` lazily provisions a backend row.
3. The **Calls** tab discovers any call-style recordings on the device. If empty, the empty state has an *Allow audio access* button.
4. Tap **Transcribe** on a recording. Grant `READ_CALL_LOG` if you like.
5. Watch the row appear under **Transcribed** as *Uploading → Queued → Transcribing → Analyzing → Completed*.
6. Tap the row. The detail screen loads `/api/calls/{id}`, `/transcript`, and `/analysis` in parallel.

If any of those steps fail, [Android troubleshooting](../android/troubleshooting.md) is your friend.

---

## Day 2 — walk one upload end-to-end with logcat open

The single most useful thing you can do on day 2 is **trace one Transcribe tap through to a completed call with logcat open**, filtering by `CallUploadWorker`, `OkHttp`, and `FirebaseIdToken`.

The flow you are following:

```
User taps Transcribe in CallsTabScreen
   │
   ▼
MainViewModel.transcribe(recording)
   │
   ▼
CallUploadEnqueuer.enqueue(uri, mediaId, …)
   │  writes UploadQueueStore (synthetic "Uploading" row)
   │  enqueues OneTimeWorkRequest with ExistingWorkPolicy.KEEP
   ▼
WorkManager schedules CallUploadWorker
   │
   ▼
CallUploadWorker.doWork (foreground after ~4s grace or on background)
   │
   ├─ CallLogMatcher (if READ_CALL_LOG granted)  → UploadMetadata JSON
   │
   ├─ IdempotencyKeyStore.getOrCreate(target)    → UUID v4 (24 h TTL)
   │
   ├─ POST /api/calls/analyze
   │     multipart audio + optional metadata JSON
   │     headers: X-API-Key, Authorization: Bearer, Idempotency-Key
   │
   ▼
202 { callId, status: QUEUED }
   │
   ├─ IdempotencyKeyStore.clear(target)
   ├─ InFlightUploadStore.record(callId, mediaId)
   └─ UploadQueueStore.dequeue(mediaId, uri)     (synthetic row replaced)
   │
   ▼
MainShellViewModel polls GET /api/calls/status?ids=…
   │  honours server nextPollMs (clamped 1–60 s)
   │  exponential backoff on errors
   ▼
COMPLETED → row goes green → tap opens CallDetailScreen
   │
   ▼
CallDetailViewModel.loadDetail(callId)
   │  GET /api/calls/{id}
   │  if cache hit: read transcript + analysis from disk
   │  else: GET /transcript and GET /analysis, write to CallContentCache
   ▼
Compose renders transcript bubbles + analysis sections
```

Every arrow here has a doc page. The most important ones to internalise:

- **[Upload pipeline](../android/upload-pipeline.md)** — the durable upload + idempotency model.
- **[Status lifecycle](../android/status-lifecycle.md)** — wire ↔ domain ↔ UI mapping.
- **[Local stores](../android/local-stores.md)** — all five `SharedPreferences` stores + `CallContentCache`.
- **[Authentication](../android/auth.md)** — Firebase token caching + 401 retry.

### Key files to open

| File | Why |
|---|---|
| `MainActivity.kt` | Single Activity; wraps content in `AuthGate`. |
| `ScryonApplication.kt` | Hilt entry; supplies the `WorkerFactory` for Hilt-Work. |
| `data/auth/AuthRepository.kt` | Firebase wrappers + sign-in / sign-out semantics. |
| `data/auth/FirebaseIdTokenProvider.kt` | The token cache. Worth reading slowly. |
| `data/remote/ScryonApi.kt` | Every endpoint we consume. |
| `data/remote/interceptor/*` | `ApiKeyInterceptor`, `FirebaseAuthInterceptor`, `FirebaseAuthAuthenticator`. |
| `data/repository/ScryonRepository.kt` | The `CallRepository` impl — DTO ↔ domain mapping, error mapping, cache. |
| `work/CallUploadWorker.kt` | The foreground service that owns the upload critical path. |
| `viewmodel/MainShellViewModel.kt` | The polling + status merge logic. |
| `ui/shell/ScryonRoot.kt` | The bottom-bar shell. |

---

## Day 3 — privacy + conventions

Read these in order:

1. **[Privacy & security](../privacy-and-security.md)** — non-negotiable. The Android-specific bits are the no-raw-audio rule and the per-uid local-store namespacing.
2. **Android coding conventions** in [Architecture · Coding conventions](../android/architecture.md#coding-conventions).
3. **[Permissions](../android/permissions.md)** — when each permission is asked, and what to do if denied.

Android-specific gotchas to internalise:

- **The UI layer never imports Retrofit, Firebase, or Hilt internals.** Repositories return domain models, not DTOs.
- **Every local store is namespaced by Firebase `uid`.** When you add a new store, do this from day one.
- **Raw audio is never persisted locally.** Bytes are streamed from `MediaStore` to OkHttp. Even the voice profile recording goes to `cacheDir/voice_profile/` and is deleted immediately after upload.
- **No `LiveData`.** ViewModels expose `StateFlow`; UI uses `collectAsStateWithLifecycle()`.

---

## Day 4 — pick a first PR

Look for issues labelled `good first issue` on [the repo](https://github.com/FluxonLabs/scryon-android/issues). Good candidates:

- A small Compose tweak (empty state copy, an icon, a spacing fix).
- A new unit test for a `ViewModel` or a local store.
- Wiring an existing roadmap item — e.g. notification deep-link (`EXTRA_HIGHLIGHT_RECORDING_ID` is plumbed; the Calls tab needs the scroll-to logic).
- A new entry in `ScryonError` mapping for an HTTP status we don't yet cover.

Stay away from these for your first PR:

- `CallUploadWorker` and the foreground-service promotion logic.
- `FirebaseIdTokenProvider` and the authenticator chain.
- Adding a new local store (touches sign-out cleanup in `AuthRepository`).
- Anything touching the multipart upload shape.

### PR checklist (memorise)

- [ ] Compose previews added/updated for any UI change.
- [ ] No new PII in `Log.d` / `Log.i` / `Log.w` (filter your logs with `adb logcat | grep -i scryon` before submitting).
- [ ] If you added a `SharedPreferences` store, it is namespaced by Firebase `uid` and wiped by `AuthRepository.signOut()`.
- [ ] If you added a new permission, it is requested at the point of use, not at app launch.
- [ ] `./gradlew :app:compileDebugKotlin :app:testDebugUnitTest` passes locally.
- [ ] Commit message describes the *why*, not the *what*.

---

## Day 5 — ship it

Submit, iterate on review, merge. Congratulate yourself.

---

## Week 2 — own a slice

Pick one of these and become the local expert:

| Slice | Where it lives |
|---|---|
| **Auth gate + sign-in** | `ui/auth/`, `data/auth/`, [Authentication](../android/auth.md) |
| **Upload pipeline** | `work/`, `data/repository/ScryonRepository.kt`, [Upload pipeline](../android/upload-pipeline.md) |
| **Status lifecycle + polling** | `viewmodel/MainShellViewModel.kt`, [Status lifecycle](../android/status-lifecycle.md) |
| **Call detail + cache** | `viewmodel/CallDetailViewModel.kt`, `data/local/CallContentCache.kt` |
| **Voice profile** | `data/voiceprofile/`, `ui/voiceprofile/`, [Voice profile setup](../android/voice-profile.md) |
| **New-recording notifications** | `notifications/`, [Notifications](../android/notifications.md) |
| **Networking layer** | `data/remote/`, [Networking](../android/networking.md) |

"Own a slice" means: read every file in it, draw your own diagram, run the screens by hand, write a one-pager explaining how it works to someone joining next month.

---

## Week 3 — pair with backend

The Android app and the backend meet at a tight REST contract. Spend a day pairing with someone on the backend team. Have them walk you through how a `POST /analyze` becomes a row, an artifact, and a `COMPLETED` status. You will find at least one thing the API could do better. File an issue or open a PR (against either repo).

Reading material for the cross-over:
- [API overview](../api/overview.md) — every endpoint we consume.
- [Call processing pipeline](../architecture/call-processing-pipeline.md) — what happens server-side after `POST /analyze` returns 202.

---

## Week 4 — performance + reliability pass

Take one screen you own and profile it. Use Android Studio's profiler. Measure:

- **Cold start time** to the Login screen and to the main shell.
- **Frame jank** when scrolling the Transcribed tab with 50+ rows.
- **Memory** during a long Compose detail open with a 30-minute transcript.

Pick one win and ship it. We do not have an SLA on these yet — but we should, and you can help define one.

---

## Reference shelf

Bookmark these:

- **[Android overview](../android/overview.md)** — tabs, tech, principles.
- **[Architecture](../android/architecture.md)** — layering, directory layout, conventions.
- **[Upload pipeline](../android/upload-pipeline.md)** — the durable upload critical path.
- **[Status lifecycle](../android/status-lifecycle.md)** — state machine.
- **[Networking](../android/networking.md)** — interceptors and error mapping.
- **[Local stores](../android/local-stores.md)** — all SharedPreferences stores + cache.
- **[Permissions](../android/permissions.md)** — when each permission is asked.
- **[Voice profile](../android/voice-profile.md)** — opt-in speaker recognition.
- **[Troubleshooting](../android/troubleshooting.md)** — symptom → cause → fix.

---

## Common stumbling blocks

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails with "google-services.json not found" | Missing file in `app/` | Drop the file in `app/` (gitignored). The plugin is applied conditionally; you can also build without it. |
| Google sign-in button does nothing | Missing `FIREBASE_WEB_CLIENT_ID` or SHA-1 not registered | Add the web client ID; register your debug SHA-1 in Firebase Console. |
| `401 — Missing or invalid X-API-Key header` | `SCRYON_API_KEY` missing or wrong | Update `local.properties`, **rebuild** (BuildConfig is compile-time). |
| Upload "completes" but row never updates | Pointing at one backend but Firebase project verifies tokens from another | Confirm the backend's Firebase project matches the one in `google-services.json`. |
| App appears to "close" right after Transcribe | Old build before deferred-foreground fix | Reinstall current build; worker now waits ~4 s before promoting. |
| Hilt-related compile errors after a refactor | Missing `@HiltViewModel` / `@HiltWorker` annotation, or a constructor change | Run `./gradlew :app:kspDebugKotlin --rerun-tasks` and re-read the error. |

For anything else, [Android troubleshooting](../android/troubleshooting.md) is more thorough.

---

## What "good" looks like after a month

- You can describe the upload + status lifecycle without notes.
- You have shipped at least 5 PRs that touched non-trivial Compose or coroutines code.
- You have written or improved one piece of documentation in `scryon-docs`.
- You have profiled at least one screen and shipped a measurable improvement.
- You have an opinion about something we should change in the app's architecture — and you wrote an ADR or filed an issue.

Welcome.

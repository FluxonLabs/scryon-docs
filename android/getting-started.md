# Getting started

This page covers everything you need to clone, configure, and run the Android app on a device or emulator.

## Prerequisites

| Tool | Version |
|---|---|
| Android Studio | Hedgehog or newer |
| JDK | 17 (Gradle uses JVM 11 target; JDK 17 runs Gradle fine) |
| Android device or emulator | API 26+ |
| Firebase project | with Email/Password, Google, and Phone sign-in enabled |
| Backend access | `SCRYON_API_KEY` |

## One-time setup

1. **Clone the repo.**

   ```bash
   git clone git@github.com:FluxonLabs/scryon-android.git
   cd scryon-android
   ```

2. **Add `google-services.json`** to the `app/` folder. It's gitignored — never commit it.

3. **Create `local.properties`** at the repo root and fill in the keys listed in [Configuration](configuration.md).

4. **Open in Android Studio → Build → Rebuild Project.** This generates `BuildConfig` constants from your `local.properties` values.

5. **Run on a device or emulator** (API 26+).

> The app builds *without* Firebase: the `google-services` plugin is applied conditionally on the presence of `google-services.json`. With no Firebase, the `AuthGate` renders the LoginScreen with a "Firebase not configured" hint, and the backend will reject calls that require a Bearer token.

## Build & run from the command line

```bash
./gradlew :app:assembleDebug           # debug APK → app/build/outputs/apk/debug/
./gradlew :app:installDebug            # build + push to a connected device
./gradlew :app:compileDebugKotlin      # fast type-check, no resources
./gradlew :app:testDebugUnitTest       # unit tests (scaffold only today)
```

Useful flags:

| Flag | Effect |
|---|---|
| `--info` / `--debug` | Gradle verbosity |
| `-PSCRYON_API_KEY=…` | Override at invocation time (handy for CI) |

`HttpLoggingInterceptor` is at `Level.BODY` in debug, `Level.NONE` in release. Credentials are always redacted.

## First-run smoke test

1. Open the app — the **AuthGate** redirects you to the LoginScreen.
2. Sign in with email / Google / phone.
3. The app calls `GET /api/users/me`, which lazily provisions a backend row on first call.
4. The **Calls** tab discovers any call-style recordings already on the device. If empty, the app shows a friendly empty-state.
5. Tap **Transcribe** on a recording. The first time, the app asks for `READ_CALL_LOG` (optional). The recording vanishes from Calls and a synthetic *Uploading* row appears in **Transcribed**.
6. Wait for the row to progress to *Queued → Transcribing → Analyzing → Completed*.
7. Tap the completed row to see the transcript and analysis.

If anything in steps 2–7 fails, jump to [Troubleshooting](troubleshooting.md).

## Repos & related docs

| Resource | Link |
|---|---|
| Android repo | [github.com/FluxonLabs/scryon-android](https://github.com/FluxonLabs/scryon-android) |
| Backend repo | [github.com/FluxonLabs/scryon-backend](https://github.com/FluxonLabs/scryon-backend) |
| Backend deployment | [api.scryon.app](https://api.scryon.app) |
| API reference (consumed by this app) | [API overview](../api/overview.md) |

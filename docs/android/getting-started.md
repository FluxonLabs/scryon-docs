# Getting started

This page covers everything you need to clone, configure, and run the Android app on a device or emulator.

## Prerequisites

| Tool | Version |
|---|---|
| Android Studio | Hedgehog or newer |
| JDK | 17 (Gradle uses JVM 11 target; JDK 17 runs Gradle fine) |
| Android device or emulator | API 26+ |
| Firebase project | with Email/Password, Google, and Phone sign-in enabled |
| Backend access | At minimum a running local backend or `STAGING_API_KEY` from Railway |

## One-time setup

1. **Clone the repo.**

   ```bash
   git clone git@github.com:FluxonLabs/scryon-android.git
   cd scryon-android
   ```

2. **Add `google-services.json`** to the `app/` folder. It's gitignored — never commit it.

3. **Create `local.properties`** at the repo root and fill in the environment keys — see [Configuration](configuration.md) for the full reference.

   Minimal setup to use the `devDebug` flavor against a local backend:
   ```properties
   sdk.dir=/Users/<you>/Library/Android/sdk
   DEV_BASE_URL=http://192.168.1.xxx:8080/   # your Mac's Wi-Fi IP
   DEV_API_KEY=dev-local-key
   FIREBASE_WEB_CLIENT_ID=<id>.apps.googleusercontent.com
   ```

   To use `stagingDebug` against the Railway staging service instead:
   ```properties
   STAGING_API_KEY=<key-from-railway>
   FIREBASE_WEB_CLIENT_ID=<id>.apps.googleusercontent.com
   ```

4. **Select your build variant** in Android Studio: **Build → Select Build Variant** and pick `devDebug` (local) or `stagingDebug` (Railway staging).

5. **Build → Rebuild Project**, then run on a device or emulator (API 26+).

> The app builds *without* Firebase: the `google-services` plugin is applied conditionally on the presence of `google-services.json`. With no Firebase, the `AuthGate` renders the LoginScreen with a "Firebase not configured" hint.

## Build flavors

The app has three flavors so you can target different environments without touching source code:

| Flavor | App ID | Launcher label | Backend |
|--------|--------|---------------|---------|
| `dev` | `com.scryon.dev` | **Scryon Dev** | Local Mac |
| `staging` | `com.scryon.staging` | **Scryon Staging** | Railway staging |
| `prod` | `com.scryon` | **Scryon** | Railway prod |

All three install as separate apps on the same device. **Never test against `prod`** — it points to real user data.

## Local debugging (end-to-end in two commands)

### 1. Start the backend

```bash
cd ../scryon-backend
./dev.sh              # without pyannote (default)
./dev.sh --pyannote   # with pyannote speaker separation
```

The script starts Postgres, prints your Mac's Wi-Fi IP, and runs the backend on `http://localhost:8080`. See [Backend local setup](../getting-started/local-setup.md) for `.env.local` key setup.

### 2. Install the app

```bash
# from the scryon-android repo root
./dev.sh           # builds + installs devDebug → "Scryon Dev"
./dev.sh staging   # builds + installs stagingDebug → "Scryon Staging"
```

**Before first run** — set your Mac's IP in `local.properties`:
```bash
ipconfig getifaddr en0   # e.g. 192.168.1.105
```
```properties
# local.properties
DEV_BASE_URL=http://192.168.1.105:8080/
```
Only needs updating when your IP changes (new network, router reconnect).

---

## Build & run from the command line

```bash
# --- dev (local backend) ---
./gradlew :app:installDevDebug          # most common day-to-day command
./gradlew :app:assembleDevDebug         # APK only

# --- staging ---
./gradlew :app:installStagingDebug
./gradlew :app:assembleStagingRelease   # for tester distribution

# --- prod (Play Store) ---
./gradlew :app:bundleProdRelease        # AAB → upload to Play Console

# --- other ---
./gradlew :app:compileDevDebugKotlin    # fast type-check, no resources
./gradlew :app:testDebugUnitTest        # unit tests (scaffold only today)
```

Useful flags:

| Flag | Effect |
|---|---|
| `--info` / `--debug` | Gradle verbosity |
| `-PDEV_API_KEY=…` | Override a key at invocation time (CI) |

`HttpLoggingInterceptor` is at `Level.BODY` in debug builds, `Level.NONE` in release. Credentials are always redacted.

## First-run smoke test

Using `devDebug` with the local backend running:

1. Open the app — the **AuthGate** redirects you to the LoginScreen.
2. Sign in with email / Google / phone.
3. The app calls `GET /api/users/me`, which lazily provisions a backend row on first call.
4. The **Calls** tab discovers any call-style recordings already on the device. If empty, the app shows a friendly empty-state.
5. Tap **Transcribe** on a recording. The first time, the app asks for `READ_CALL_LOG` (optional). The recording disappears from Calls and a synthetic *Uploading* row appears in **Transcribed**.
6. Wait for the row to progress: *Queued → Transcribing → Analyzing → Completed*.
7. Tap the completed row to see the transcript and analysis.

If anything in steps 2–7 fails, see [Troubleshooting](troubleshooting.md).

## Related docs

| Resource | Link |
|---|---|
| Android repo | [github.com/FluxonLabs/scryon-android](https://github.com/FluxonLabs/scryon-android) |
| Backend repo | [github.com/FluxonLabs/scryon-backend](https://github.com/FluxonLabs/scryon-backend) |
| Staging backend | [api-staging.scryon.app](https://api-staging.scryon.app) |
| Prod backend | [api.scryon.app](https://api.scryon.app) |
| API reference | [API overview](../api/overview.md) |
| Configuration reference | [Configuration](configuration.md) |

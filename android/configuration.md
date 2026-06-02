# Configuration

All Android configuration lives in `local.properties` at the repo root (gitignored). Values are injected per build flavor via `BuildConfig` at compile time — **rebuild after every change**.

## `local.properties`

```properties
sdk.dir=/Users/<you>/Library/Android/sdk

# === Dev (local Mac backend) ===
# Your Mac's Wi-Fi IP: run `ipconfig getifaddr en0` in Terminal
DEV_BASE_URL=http://192.168.1.xxx:8080/
DEV_API_KEY=dev-local-key

# === Staging (Railway staging service) ===
# STAGING_BASE_URL defaults to https://api-staging.scryon.app/ — only override for custom URLs
STAGING_API_KEY=<key-from-railway-staging-env-vars>

# === Prod (Railway prod — real users only, never test here) ===
# PROD_BASE_URL defaults to https://api.scryon.app/ — no override needed
PROD_API_KEY=<key-from-railway-prod-env-vars>

# === Firebase (shared across all environments) ===
FIREBASE_WEB_CLIENT_ID=<id>.apps.googleusercontent.com
```

### Key reference

| Key | Flavor | Required | Notes |
|-----|--------|----------|-------|
| `DEV_BASE_URL` | `dev` | yes | URL of local Mac backend. Must end with `/`. Default: `http://10.0.2.2:8080/` (emulator). |
| `DEV_API_KEY` | `dev` | no | Any string — local backend has `SCRYON_API_KEY=dev-local-key` by default. |
| `STAGING_BASE_URL` | `staging` | no | Defaults to `https://api-staging.scryon.app/`. Override when using Railway-generated URL. |
| `STAGING_API_KEY` | `staging` | yes | Copy from Railway staging service → Variables → `SCRYON_API_KEY`. |
| `PROD_BASE_URL` | `prod` | no | Defaults to `https://api.scryon.app/`. No override needed. |
| `PROD_API_KEY` | `prod` | yes | Copy from Railway prod service → Variables → `SCRYON_API_KEY`. |
| `FIREBASE_WEB_CLIENT_ID` | all | Google Sign-In only | OAuth web client ID from Firebase Console → Auth → Sign-in method → Google. |

Resolution order for each key (in `app/build.gradle.kts`):
1. `local.properties`
2. Gradle `-P` flags or `gradle.properties`
3. Environment variables

## Build flavors

The app has three product flavors that map directly to the three environments:

| Flavor | App ID | Launcher label | Backend |
|--------|--------|---------------|---------|
| `dev` | `com.scryon.dev` | **Scryon Dev** | Local Mac (`DEV_BASE_URL`) |
| `staging` | `com.scryon.staging` | **Scryon Staging** | Railway staging (`STAGING_BASE_URL`) |
| `prod` | `com.scryon` | **Scryon** | Railway prod (`PROD_BASE_URL`) |

All three can be installed on the same device simultaneously (different app IDs). **Never run tests against the `prod` flavor** — it points to real user data.

### Selecting a build variant

In Android Studio: **Build → Select Build Variant** and choose from the list (`devDebug`, `stagingDebug`, `prodRelease`, etc.).

From the command line:
```bash
./gradlew installDevDebug       # local backend
./gradlew installStagingDebug   # Railway staging
./gradlew bundleProdRelease     # Play Store AAB
```

## Network security (cleartext HTTP)

The `dev` flavor ships its own `network_security_config.xml` at `app/src/dev/res/xml/` that permits cleartext HTTP to any host, so your physical device can reach the Mac's LAN IP (e.g. `http://192.168.1.x:8080`).

The `staging` and `prod` flavors use the main config (`app/src/main/res/xml/`) which blocks all cleartext and only allows HTTPS.

## Firebase

The app uses a **single Firebase project** across all three environments.

Required sign-in providers:
- **Email/Password**
- **Google**
- **Phone**

### Email verification

The app sends a verification email on email/password sign-up. Customise at Firebase Console → Authentication → Templates → Email address verification.

### Google Sign-In

The Credential Manager API needs:
1. `FIREBASE_WEB_CLIENT_ID` in `local.properties`.
2. The **SHA-1** of your debug and release signing keys registered in Firebase Console → Project settings → Your apps → Android.

Without both, the Google button silently does nothing.

### Phone sign-in

No extra config beyond enabling the provider in Firebase. Uses SafetyNet/Play Integrity, then SMS fallback.

## ProGuard / R8

`minifyEnabled = false` in release today. Once tests are written, R8 will be enabled with a custom rules file.

## Where BuildConfig is consumed

| Constant | Flavor | Used by |
|----------|--------|---------|
| `BuildConfig.SCRYON_BASE_URL` | per-flavor | `NetworkModule` (Retrofit base URL) |
| `BuildConfig.SCRYON_API_KEY` | per-flavor | `ApiKeyInterceptor` |
| `BuildConfig.FIREBASE_WEB_CLIENT_ID` | all (defaultConfig) | `AuthRepository` (Credential Manager) |
| `BuildConfig.DEBUG` | build type | `HttpLoggingInterceptor` log level |

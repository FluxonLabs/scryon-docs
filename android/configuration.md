# Configuration

All Android configuration lives in `local.properties` at the repo root. Values flow through Gradle into Kotlin via `BuildConfig`.

## `local.properties`

```properties
# Backend
SCRYON_BASE_URL=https://api.scryon.app/
SCRYON_API_KEY=<your-key-from-railway>

# Firebase (only needed for Google Sign-In)
FIREBASE_WEB_CLIENT_ID=<id>.apps.googleusercontent.com
```

| Key | Required | Notes |
|---|---|---|
| `SCRYON_BASE_URL` | yes | Backend base URL. Must end with a slash. |
| `SCRYON_API_KEY` | yes | Shared-secret guard for the backend. |
| `FIREBASE_WEB_CLIENT_ID` | only for Google Sign-In | OAuth web client ID; appears in Firebase Console → Authentication → Sign-in method → Google. |

Resolution order in `app/build.gradle.kts`:

1. `local.properties`
2. Gradle `-P` flags or `gradle.properties`
3. Environment variables

After editing `local.properties` you **must** rebuild the app — `BuildConfig` is generated at compile time.

## Firebase

The app expects a Firebase project with these sign-in providers enabled:

- **Email/Password**
- **Google**
- **Phone**

### Email verification template

When email/password sign-in is enabled, the app sends a Firebase verification email on sign-up. Customise the template at Firebase Console → Authentication → Templates → Email address verification. The fallback `ActionCodeSettings` template lives in `AuthRepository`.

### Google Sign-In

The Credential Manager API needs:

1. `FIREBASE_WEB_CLIENT_ID` in `local.properties` (above).
2. The **SHA-1** of your debug and release signing keys registered in Firebase Console → Project settings → Your apps → Android.

Without both, the Google button silently does nothing.

### Phone sign-in

No extra config beyond enabling the provider in Firebase. The app uses Firebase's SafetyNet/Play Integrity attestation, then SMS as a fallback.

## ProGuard / R8

`minifyEnabled = false` in release today. Once tests are written, we'll enable minification with a custom rules file.

## Where BuildConfig is consumed

| Constant | Used by |
|---|---|
| `BuildConfig.SCRYON_BASE_URL` | `NetworkModule` (Retrofit base URL). |
| `BuildConfig.SCRYON_API_KEY` | `ApiKeyInterceptor`. |
| `BuildConfig.FIREBASE_WEB_CLIENT_ID` | `AuthRepository` (Credential Manager). |
| `BuildConfig.DEBUG` | `HttpLoggingInterceptor` log level. |

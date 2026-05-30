# Voice profile

Voice profiles let Scryon identify the authenticated user among diarized speakers. This is an **opt-in** feature gated by `SCRYON_VOICE_EMBEDDING_ENABLED`.

> When the feature flag is off, every endpoint below returns `404 feature_not_available`.

See [Voice embedding](../features/voice-embedding.md) for the full feature design.

## POST `/api/users/me/voice-profile`

Create or replace the authenticated user's voice profile.

### Request

`Content-Type: multipart/form-data` with one part:

| Part | Required | Notes |
|---|---|---|
| `file` | yes | A clean voice sample of the user. WAV/MP3/M4A. Duration between `SCRYON_VOICE_SAMPLE_MIN_SECONDS` and `SCRYON_VOICE_SAMPLE_MAX_SECONDS`. |

The client **must** display consent UI before invoking this endpoint. The current consent version (`SCRYON_VOICE_CONSENT_VERSION`) is stamped on the row so future product changes can require re-consent.

### Response — `201 Created`

```json
{
  "status": "ACTIVE",
  "provider": "pyannote",
  "consentVersion": "v1",
  "createdAt": "2026-05-29T13:00:00Z",
  "sampleDurationSeconds": 22
}
```

### Errors

| Status | code | Cause |
|---|---|---|
| 400 | `voice_sample_too_short` | Below `SCRYON_VOICE_SAMPLE_MIN_SECONDS`. |
| 400 | `voice_sample_too_long` | Above `SCRYON_VOICE_SAMPLE_MAX_SECONDS`. |
| 413 | `voice_sample_too_large` | Above `SCRYON_VOICE_SAMPLE_MAX_SIZE_MB`. |
| 415 | `unsupported_media_type` | Unknown audio MIME. |
| 502 | `voice_provider_error` | Provider returned a non-recoverable error. |

## GET `/api/users/me/voice-profile/status`

Cheap status check for the client to decide what UI to show.

### Response — `200 OK`

```json
{
  "status": "ACTIVE",
  "provider": "pyannote",
  "consentVersion": "v1",
  "createdAt": "2026-05-29T13:00:00Z"
}
```

When the user has never created a profile:

```json
{ "status": "MISSING" }
```

When the feature is disabled the endpoint returns `404 feature_not_available`.

## DELETE `/api/users/me/voice-profile`

Remove the user's voice profile.

### Response — `204 No Content`

- The row is removed from `user_voice_profiles`.
- The provider-side embedding (if applicable) is deleted on best-effort.
- Subsequent calls fall back to text-only speaker resolution.

Idempotent — a second call returns `204` even if no profile exists.

## Privacy notes

- The voice sample is **not retained** after the provider produces an embedding. The bytes live only in the request handler.
- The embedding is stored as an opaque provider blob in `user_voice_profiles.embedding_json`. Scryon does not decode or interpret it.
- The `voiceMatchScore` exposed on transcripts is a single float in `[0, 1]` — no biometric data leaks through it.
- Re-uploading replaces the previous profile in place; `(user_id)` is unique.

See [Privacy & security](../privacy-and-security.md) for the full data-handling contract.

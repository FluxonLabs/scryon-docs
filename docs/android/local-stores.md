# Local stores

All on-device persistence is `SharedPreferences`-backed and **namespaced by Firebase `uid`** (or `"guest"` when no user is signed in). Two accounts on one device never share state.

## Store inventory

| Store | Purpose | Keys |
|---|---|---|
| `CallRecordingPrefs` | MediaStore IDs the user has already transcribed; dismissed-from-Calls IDs; new-recording notify watermark & dedupe set. Wiped on sign-out. | `transcribed_media_ids`, `dismissed_pending_media_ids`, `notify_watermark_date_modified_sec`, `notified_new_recording_ids`, `notify_new_recording` |
| `InFlightUploadStore` | `callId ↔ mediaId` bindings for uploads accepted by the server but not yet terminal. Cleared on sign-out. | `entries_v1` (JSON list) |
| `IdempotencyKeyStore` | UUID v4 per upload target, 24 h TTL. Wiped on sign-out. | `entries_v1` (JSON list) |
| `UploadQueueStore` | Recordings the user tapped Transcribe on that have **not yet been accepted** by the backend. Drives synthetic "Uploading" rows and hides the recording from the Calls list. Cleared on sign-out. | `entries_v1` (JSON list of `mediaId / uri / fileName / queuedAtMillis`) |
| `DismissedCallStore` | Backend `callId`s the user cancelled mid-analysis. Excluded from `pollTargets` and from the Transcribed list. Cleared on sign-out. | `ids` (StringSet) |

## On-disk cache: `CallContentCache`

Separate from SharedPreferences — completed-call transcript and analysis JSON are written to:

```
filesDir/scryon-call-cache/<uid>/<callId>.{transcript|analysis}.v1.json
```

| Event | Cache behaviour |
|---|---|
| First detail open (completed call) | Network fetch → write JSON → parse |
| Repeat detail open | Read JSON → parse (skip network) |
| Stale / unparseable blob | Delete file → one network retry |
| `DELETE /api/calls` (success / notFound) | `invalidate(callIds)` |
| Sign-out / Firebase account delete | `clearForUid(uid)` |

Not cached: call envelope, list, status poll, or action items (mutable). No LRU eviction in v1; growth is bounded by how many completed calls the user keeps.

## Per-store lifecycle

### `CallRecordingPrefs`

- **`transcribed_media_ids`** — once a recording is accepted by the server, its MediaStore ID is added here so the Calls tab never shows it again (even if the server later fails).
- **`dismissed_pending_media_ids`** — recordings the user explicitly dismissed from the Calls tab without transcribing.
- **`notify_watermark_date_modified_sec`** — the `DATE_MODIFIED` timestamp at the moment the user enabled new-recording notifications. Only files newer than this watermark trigger a notification.
- **`notified_new_recording_ids`** — dedupe set so the same file never fires twice.
- **`notify_new_recording`** — boolean toggle for the new-recording notification feature.

### `InFlightUploadStore`

Written when `POST /api/calls/analyze` returns 202. Removed when the call reaches a terminal status (`COMPLETED` or `FAILED`) or when the user cancels analysis. Used to match synthetic Uploading rows to real backend rows by `mediaId`.

### `IdempotencyKeyStore`

Each upload target (`media:<id>` or `uri:<contentUri>`) gets a UUID v4 key with a 24-hour TTL. Retained on network errors so worker retries are idempotent. Cleared on a structured server response (accepted or failed).

### `UploadQueueStore`

Written immediately when the user taps Transcribe, *before* the worker runs. Removed when the worker gets a 202 from the server (or when the user cancels the upload). Drives the synthetic "Uploading" row in the Transcribed tab.

### `DismissedCallStore`

Written when the user taps **Cancel analysis** on an in-flight row. The `callId` is excluded from polling and from the Transcribed list permanently (for this user on this device). Server-side processing may still complete — it just won't appear in the app.

## Sign-out cleanup

`AuthRepository.signOut()` wipes **all** of the above stores (plus `CallContentCache`) before calling `FirebaseAuth.signOut()`, so the uid namespace is still resolvable during cleanup.

## What is never stored locally

- **Raw audio bytes** — read from `MediaStore` and streamed to the server; never copied to app-private storage.
- **Voice profile recordings** — written to `cacheDir/voice_profile/` only during the setup wizard; deleted on success, cancel, screen dispose, and sign-out.
- **Firebase ID tokens** — held in memory only (`FirebaseIdTokenProvider`); cleared on sign-out.

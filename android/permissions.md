# Permissions

Runtime permissions are declared in `AndroidManifest.xml` and requested at the point of use — never on first launch.

## Declared permissions

| Permission | When requested |
|---|---|
| `INTERNET` | always (manifest only) |
| `READ_MEDIA_AUDIO` | API 33+ — to scan MediaStore for call-style recordings |
| `READ_EXTERNAL_STORAGE` | maxSdkVersion 32 — legacy equivalent of `READ_MEDIA_AUDIO` |
| `POST_NOTIFICATIONS` | API 33+ — only when the user enables the New-recording toggle; also required (gracefully) for the upload foreground-service notification |
| `RECEIVE_BOOT_COMPLETED` | manifest only — re-arm the MediaStore observer after reboot |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` | manifest only — `CallUploadWorker` foreground service while the app is backgrounded |
| `WAKE_LOCK` | implicit dependency of foreground-service uploads |
| `READ_CALL_LOG` | **optional** — asked the first time the user taps Transcribe; powers call-log enrichment. Uploads continue to work without it |
| `RECORD_AUDIO` | **optional** — asked **only** when the user opens *Settings → Speaker recognition → Set up voice profile*. The mic is never opened anywhere else in the app |

`util/RecordingPermissions.kt` centralises the runtime checks and chooses the correct permission for the device's API level.

## Audio access (`READ_MEDIA_AUDIO` / `READ_EXTERNAL_STORAGE`)

Required to discover call-style recordings on the device. Without it the Calls tab shows an empty state with an **Allow audio access** button.

The app does **not** need `READ_PHONE_STATE` or any call-log permission to discover recordings — detection is purely MediaStore-based.

## Call-log enrichment (`READ_CALL_LOG`)

**Optional.** Requested the first time the user taps **Transcribe** in a session.

When granted, `CallLogMatcher` runs inside `CallUploadWorker.doWork` before each upload and matches the recording against `CallLog.Calls` to produce structured metadata:

- `contactName`, `contactId`, `phoneNumber`
- `direction` — `INCOMING` / `OUTGOING` / `UNKNOWN`
- `durationSeconds`, `recordedAt`

This metadata is sent as a JSON multipart part on `POST /api/calls/analyze`, which the backend uses for better USER vs CONTACT diarisation and action-item assignee labels.

When denied or no row matches, the upload proceeds with flat params — feature parity with earlier builds is unchanged.

The **Settings → Call log enrichment** card shows the current permission state and offers *Allow access* / *Open app settings*.

## Notifications (`POST_NOTIFICATIONS`)

Required on API 33+ for:

1. **New-recording notifications** — opt-in via Settings → Notifications.
2. **Upload foreground-service notification** — shown when `CallUploadWorker` promotes to foreground (after ~4 s or when the app goes to background).

If denied, uploads still work but lose foreground priority on some OEMs.

## Voice profile (`RECORD_AUDIO`)

Requested **only** when the user taps the mic in the voice profile setup wizard. Never requested on app launch or anywhere else.

If previously denied, the wizard shows an *Open app settings* deep-link instead of re-prompting.

## Foreground service

`FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` are declared in the manifest. The upload worker uses `FOREGROUND_SERVICE_TYPE_DATA_SYNC` on Android 14+. No runtime permission is needed for these — they're manifest-only.

## Permission request flow summary

```
App launch
  └─ no permissions requested

Calls tab (empty, no audio permission)
  └─ "Allow audio access" button → READ_MEDIA_AUDIO / READ_EXTERNAL_STORAGE

First Transcribe tap (session)
  └─ READ_CALL_LOG dialog (optional, skippable)

Settings → Notifications toggle ON
  └─ POST_NOTIFICATIONS (API 33+)

Settings → Speaker recognition → Set up voice profile → tap mic
  └─ RECORD_AUDIO
```

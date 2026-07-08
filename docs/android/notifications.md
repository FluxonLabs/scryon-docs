# New-recording notifications

An opt-in feature surfaced in **Settings → Notifications**. When enabled, the app watches `MediaStore` for new call-style recordings and posts a notification so the user can open the app and transcribe them.

## Flow

```mermaid
flowchart TD
    A[Settings toggle ON] --> B[Permission grants:<br/>READ_MEDIA_AUDIO + POST_NOTIFICATIONS]
    B --> C[NewRecordingMediaObserver.refreshRegistration]
    C --> D[ContentObserver on MediaStore.Audio.EXTERNAL_CONTENT_URI]
    C --> E[WorkManager unique periodic 15-min backup]
    D -->|onChange · debounced 1.4s| F[performNewRecordingScan]
    E -->|every 15 min| F
    F -->|new untranscribed call-style row<br/>past the watermark| G[PostCallNotificationHelper]
    G --> H[Notification · tap → MainActivity]
```

## Watermark

When the user enables the toggle, the app records the current `DATE_MODIFIED` timestamp as a **watermark** in `CallRecordingPrefs`. Only files with a `DATE_MODIFIED` *newer* than the watermark trigger a notification — old library files never fire.

## Dedupe

`notified_new_recording_ids` in `CallRecordingPrefs` is a set of MediaStore IDs already notified. The same file never fires twice, even across app restarts.

## Boot recovery

`BootCompletedReceiver` re-registers the `ContentObserver` after device reboot so the feature survives a restart without the user re-enabling it.

## Backup scan

A WorkManager **unique periodic** job (every 15 minutes) acts as a safety net in case the `ContentObserver` misses an event (some OEMs throttle or batch MediaStore notifications).

## No phone-state permission

Detection is purely MediaStore-based. The app does **not** need `READ_PHONE_STATE` or call logs to detect new recordings.

## Notification tap behaviour

Tapping the notification opens `MainActivity`. `EXTRA_HIGHLIGHT_RECORDING_ID` is plumbed through the intent, but the Calls tab does not yet scroll-to / pulse the highlighted row (roadmap item).

## Disabling

Turning the toggle off in Settings:

1. Unregisters the `ContentObserver`.
2. Cancels the periodic WorkManager job.
3. Leaves the watermark and dedupe set intact (so re-enabling doesn't notify for old files).

## Other Android notifications

This page is specifically about the local, MediaStore-driven "new recording found" notification. The app has two other notification sources, both server-triggered via FCM rather than local device state — full architecture in **[Push notifications](../features/push-notifications.md)**:

- **Transcription results** — a call reaching `COMPLETED`/`FAILED` pushes a system notification (channel `transcription_results`).
- **Admin account events** — an admin suspending/disabling the account, granting credits, or changing the plan pushes either an immediate in-app dialog (if the app is foregrounded) or a system notification (channel `account_events`, if backgrounded).

### Account-status UI, beyond notifications

Separately from any notification, `AuthGate` reads the signed-in account's `accountStatus` (from `GET /api/users/me`, refreshed on every launch and again after an `account_status` push) and adjusts the UI directly:

- **SUSPENDED** — a one-time dismissible `AlertDialog` on top of the normal shell (most of the app still works; only new uploads are blocked), plus a persistent banner on the Profile and Limits screens.
- **DISABLED** — the normal shell isn't shown at all; `DisabledAccountScreen` replaces it with a full-screen explanation and a Sign-out button, since every backend request 403s for a disabled account anyway.

See [Admin console § Account status](../admin/overview.md#account-status) for what triggers each state.

## Related

- **[Permissions](permissions.md)** — `POST_NOTIFICATIONS` and `READ_MEDIA_AUDIO` requirements.
- **[Architecture](architecture.md)** — `CallRecordingScanner` heuristics.
- **[Push notifications](../features/push-notifications.md)** — the FCM-driven notifications above, end to end.
- **[Admin console](../admin/overview.md)** — what an admin action does to an account.

# Play Store submission — READ_CALL_LOG risk

The Android app declares `READ_CALL_LOG`, one of Google Play's restricted permissions
(the [Permissions & APIs Declaration Form](https://support.google.com/googleplay/android-developer/answer/9214102)
policy family). Historically Play has scrutinized this permission hardest for apps that
aren't the default phone/SMS handler — which Scryon deliberately isn't. This page exists
so the declaration form and store listing are prepared *before* submission rather than
scrambled together after a rejection.

## What the app actually does with it

- **Optional, not required.** `READ_CALL_LOG` is requested once, on the user's first tap
  of "Transcribe" (see `android/permissions.md`). If denied, uploads proceed without it —
  contact name / call direction enrichment is simply skipped.
- **In-app disclosure already exists.** Settings → Call log enrichment shows this exact
  copy before/around the permission request (`SettingsTabScreen.kt`,
  `CallLogEnrichmentContent`):

  > "Match each recording against the system call log so we can ship the caller's contact
  > name and call direction with the upload. The backend uses this for nicer speaker
  > labels (USER vs CONTACT). Uploads work fine without it."

- **Never used to read live call state.** The app doesn't listen to `PhoneStateListener`,
  doesn't intercept calls, and isn't a dialer. It matches *existing* recordings (already on
  the device, made by the phone's own call-recorder or a third-party recorder app) against
  historical call-log entries — see `android/overview.md` and [`docs/README.md`](../README.md).

## Permissions Declaration Form — draft justification

Paste (and adapt) into Play Console's declaration form for the Call Log permission group:

> Scryon is a call-transcription and analysis app. It does not record calls, is not a
> dialer, and does not access the call log to place or monitor calls. The app discovers
> call-recording audio files already present on the device (created by the user's own
> call-recorder app or the phone manufacturer's built-in recorder) and lets the user
> manually transcribe them. `READ_CALL_LOG` is used only to match a discovered recording's
> timestamp/duration against the user's call history, so the resulting transcript can show
> the caller's name and call direction (incoming/outgoing) instead of a bare filename. This
> is optional core functionality: if the permission is denied, the app continues to work
> and transcribes the recording without that metadata. The permission is requested once, at
> the point of first use (tapping "Transcribe"), with an in-app explanation shown in
> Settings at any time. No call-log data is used for any purpose besides this one-time
> metadata match at upload time, and it is never sold, shared with advertisers, or used for
> anything unrelated to the user's own uploaded recordings.

## Store listing framing — do not say

Matches the corrections already made on the marketing site (`scryon-web`) — the app must
never be described in terms that imply it records calls or a dialer role:

- ❌ "Records your calls" / "built-in recorder" / "auto-records"
- ❌ Anything implying default-dialer or default-SMS-handler status
- ✅ "Finds the call recordings already on your phone and transcribes them"
- ✅ "Reads your call log (optional) to label who you spoke with"

## Also check before submitting

- [ ] Data Safety form in Play Console lists Call Logs as collected data, purpose
      "App functionality," not shared with third parties for advertising, and marked
      optional/user-controlled.
- [ ] Store listing screenshots don't show a "record" button or recording UI of any kind.
- [ ] Privacy policy URL in the listing points to the live `scryon.app/privacy` page, which
      already describes call-log use consistently with the justification above.

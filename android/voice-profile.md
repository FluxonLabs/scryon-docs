# Voice profile setup

The Android app supports opt-in **speaker recognition** via a voice profile. When enabled on the backend, the user's voice embedding helps the diarization pipeline label them as `USER` with their display name in transcripts.

> Embedding bytes are **never** returned to the client. The backend stores them server-side only.

## Feature gating

The feature is **gated on a backend flag** (`enabled` on `GET /api/users/me/voice-profile/status`):

- When the flag is **off** — the Settings card is hidden entirely. No microphone permission is requested and no UI is visible.
- When the flag is **on** — the card appears under *Settings → Speaker recognition*.

## Settings card states

| State | UI |
|---|---|
| No profile yet | CTA *Set up voice profile* → opens the wizard |
| Profile exists | Provider/model, created/updated dates, sample count, *Re-record voice sample* + *Delete voice profile* (with confirm dialog → `DELETE /api/users/me/voice-profile`) |

## Setup wizard flow

1. **Consent checkbox** — must be checked before Upload activates. The boolean is sent verbatim to the backend as the `consentAccepted` multipart part.
2. **Microphone permission** — requested only when the user taps the mic. If previously denied, an *Open app settings* deep-link is shown.
3. **Script display** — the user reads aloud a short script (target 20–30 s, hard min 15 s, hard max 45 s).
4. **Recording** — `VoiceSampleRecorder` uses `MediaRecorder`, writes to `cacheDir/voice_profile/` only, auto-stops at the 45 s cap.
5. **Upload** — `POST /api/users/me/voice-profile` (multipart `file` + `consentAccepted=true`).
6. **Cleanup** — temp file deleted on success, cancel, screen dispose, and sign-out.

## How it affects transcripts

Transcripts already render speaker info from the existing v2 fields (`speakerLabel`, `role`, `speakerDisplayName`). Once the backend attributes a speaker to the user's profile it sets `role=USER` and `displayName=<name>` — the existing chat bubble lights up with the *(You)* tag. **No client change required.**

The optional `labelSource` field on `TranscriptSpeakerDto` is plumbed for future UI work but does not change rendering today.

## Privacy guarantees

| Data | Where it lives |
|---|---|
| Voice sample (temp) | `cacheDir/voice_profile/` — deleted immediately after upload or on cancel |
| Voice embedding | Backend only — never returned to the client |
| Consent flag | Sent to backend as `consentAccepted=true`; stored server-side |

## Key files

| File | Role |
|---|---|
| `data/voiceprofile/VoiceSampleRecorder.kt` | `MediaRecorder` wrapper, cacheDir-only, auto-cleans |
| `data/repository/ScryonVoiceProfileRepository.kt` | `getStatus` / `upload` / `delete` |
| `viewmodel/VoiceProfileViewModel.kt` | Wizard state machine + Settings card backing |
| `ui/voiceprofile/VoiceProfileSetupScreen.kt` | Full-screen wizard |
| `ui/shell/tabs/SettingsTabScreen.kt` | *Speaker recognition* card (hidden when flag off) |

## Backend reference

See [Voice profile API](../api/voice-profile.md) and [Voice embedding feature](../features/voice-embedding.md) for server-side details.

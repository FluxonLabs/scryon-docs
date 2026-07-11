# Voice embedding

An **opt-in** feature that recognises the authenticated **user's own voice** in a
call and labels that speaker as `USER` before the text-based rules run. It is the
strongest single naming signal (see the ladder in
[Speaker resolution](speaker-resolution.md)).

## How it works

1. **Enrollment** — with the user's explicit consent, Scryon records a short
   voice sample and asks the embedding provider (pyannoteAI) for a **voiceprint**,
   stored as a per-user `UserVoiceProfile` (`embeddingJson` + provider/model). No
   raw audio is kept.
2. **Matching** — during a call, `VoiceMatchService` asks the provider to
   identify the user's voiceprint across the call's audio, buckets the
   per-segment identifications by diarization `sourceSpeakerId`, and:
   - exactly one diarized speaker crosses the threshold → that speaker is
     pre-labelled `USER` with `LabelSource.VOICE_EMBEDDING`;
   - multiple cross the threshold → `AMBIGUOUS`, no label;
   - none / feature off / no profile / no diarization → skip.
3. The text resolver then names the **counterpart** by elimination and fills in
   the user's display name.

{% hint style="info" %}
Voice embedding only **improves** identification — it never blocks the pipeline.
Every failure path (provider error, no match, no profile) falls back cleanly to
the text-based [Speaker resolution](speaker-resolution.md).
{% endhint %}

## Privacy

- Strictly **opt-in**: creating a profile requires `consentAccepted=true`.
- Stores a numeric embedding, not audio; a privacy-safe match **score** is
  surfaced in telemetry, never biometric data.
- Deletion is idempotent and runs **even when the feature is disabled**, so users
  can purge their voiceprint at any time.

## Configuration

Off by default; reuses the pyannote credentials when on (provider defaults to
`pyannote`). See the [Configuration reference](../getting-started/configuration-reference.md)
and [Voice profile API](../api-reference/voice-profile.md) /
[Android voice-profile setup](../android-client/voice-profile-setup.md).

## Scope & roadmap

Today only the **user** is enrolled. Per-**contact** voiceprints — built from
confirmed past calls to give persistent identity across calls — are a planned
extension, alongside user tap-to-rename correction that would feed enrollment.

## Code map

| Concern | Class |
|---------|-------|
| Match user in a call | `com.scryon.voice.VoiceMatchService` |
| Profile CRUD + consent | `com.scryon.voice.UserVoiceProfileService`, `UserVoiceProfileController` |
| Provider | `com.scryon.voice.PyannoteVoiceEmbeddingProvider`, `DisabledVoiceEmbeddingProvider` |
| Stored profile | `com.scryon.voice.UserVoiceProfile` |

See also: [Speaker resolution](speaker-resolution.md) · [Diarization](diarization.md).

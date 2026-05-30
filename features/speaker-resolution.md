# Speaker resolution

Speaker resolution is the step that turns raw `SPEAKER_00` / `SPEAKER_01` diarization labels into real names like `Praveen` / `Ravi`. It is **deterministic, text-only, and conservative** — when evidence is weak, the speaker stays `UNKNOWN` rather than receiving a wrong name.

> **Important.** Voice analysis happens in a separate step ([Voice embedding](voice-embedding.md)). This service is intentionally non-biometric.

## Rule ordering

The resolver applies rules in order of evidence strength. The first matching rule wins.

1. **Voice match** — if `VoiceMatchService` pre-labelled a speaker `role=USER` with `labelSource=VOICE_EMBEDDING`, the resolver fills in the user's display name (without touching the voice matcher's confidence).
2. **Greeting match** — speaker says `"hi <name>"` / `"hello <name>"` / `"good morning <name>"` etc. within ≤ 2 tokens of a name variant. The speaker who greets is labelled as the *other* party. `HIGH` confidence when within the first 2 segments AND first 30 s; `MEDIUM` otherwise.
3. **Name mention asymmetry** — Speaker A mentions a name and Speaker B never does → A takes the opposite role at `MEDIUM`. If both speakers mention both names → ambiguous; nothing assigned.
4. **By-elimination** — strict two-speaker call, one resolved at HIGH/MEDIUM → the other takes the opposite role at `MEDIUM`. Three-or-more-speaker calls do *not* auto-resolve untouched speakers.
5. **Direction tiebreaker** — `INCOMING` / `OUTGOING` direction can promote a `MEDIUM` greeting match to `HIGH`. Direction alone never assigns a label.
6. **Direction-aware positional fallback** — last resort for a clean two-speaker call with no other evidence. Maps appearance order + direction:
   - `INCOMING` → first speaker = `USER`
   - `OUTGOING` → first speaker = `CONTACT`
   - `UNKNOWN` direction → first speaker = `USER`

   Always `LOW` confidence, tagged `POSITIONAL_FALLBACK`, emits warning `positional_fallback_used`.
7. **Phone fallback** — `contactName` missing but `phoneNumber` present → CONTACT becomes `"Contact ending NNNN"` (last 4 digits only). The rest of the number never enters a transcript field.

## Token-boundary matching

Name matches respect word boundaries:

- `"ram"` does **not** match `"program"`.
- `"alice"` does **not** match `"alicia"`.
- Common honorifics (`mr`, `mrs`, `ms`, `sir`, `madam`, `shri`, `dr`) are stripped before extracting the first name to search.

## Privacy

The resolver emits a privacy-safe `speakerResolution` telemetry block on the transcript:

```json
{
  "strategyVersion": 2,
  "usedUserDisplayName": true,
  "usedContactName": true,
  "usedDirection": true,
  "usedPhoneFallback": false,
  "voiceEmbeddingEnabled": false,
  "voiceProfileUsed": false,
  "voiceMatchStatus": "DISABLED",
  "totalSpeakerCount": 2,
  "resolvedSpeakerCount": 2,
  "warnings": ["positional_fallback_used"]
}
```

No raw names, transcript fragments, or phone numbers appear in this block — only counts, booleans, and short warning codes.

## "Speaker 1 = user" decision

A natural user expectation is "speaker 1 is me, speaker 2 is the other side". This is only true for **incoming** calls. On outgoing calls the callee answers first ("Hello?"), so the first voice is the contact. The positional fallback is therefore direction-aware. When direction is unknown, we default to the user's intuition (speaker 1 = user).

## What this service is NOT

- Not an LLM. No prompts, no creative interpretation.
- Not a speaker identification system. We never store voiceprints in this service. (See [Voice embedding](voice-embedding.md) for the opt-in feature that does.)
- Not the place for user corrections. A future user-correction endpoint will write back with `labelSource=MANUAL`.

## Code map

| Service | File |
|---|---|
| `SpeakerNameResolutionService` | Resolver. |
| `NameMatcher` | Token-boundary-aware name matching. |
| `CallContext` | Metadata bundle (display name, contact, phone, direction). |
| `LabelSource` | Enum of evidence sources. |
| `SpeakerRole` / `SpeakerConfidence` | Role and confidence enums. |

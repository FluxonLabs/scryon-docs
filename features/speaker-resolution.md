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
6. **Answering-pattern detection** — scans the first 4 segments (within 20 s) for short answering phrases. The speaker who opens with such a phrase answered the ringing phone — they are the `CONTACT`; the other becomes `USER` by elimination. `MEDIUM` confidence, tagged `ANSWERING_PATTERN`. Emits warning `answering_pattern_used`.

   Recognised answering phrases include: `hello`, `yes`, `speaking`, `go ahead`, `who is this`, `yeah`, `haan`, `bolo`, `hallo`, and common variants.

7. **Unresolved — leave UNKNOWN** — if no rule above assigned either speaker, both remain `role=UNKNOWN`. No direction-based guess is made. A `speaker_roles_unresolved` quality warning is emitted so the client can surface an honest message rather than a confident but wrong label.
8. **Phone fallback** — `contactName` missing but `phoneNumber` present → CONTACT becomes `"Contact ending NNNN"` (last 4 digits only). The rest of the number never enters a transcript field.

## Why call direction is not used for role assignment

An earlier version of the resolver used call direction (`INCOMING` / `OUTGOING`) as a last-resort heuristic: *"if OUTGOING, the callee answers first → first speaker = CONTACT."* This was removed because:

- **Direction ≠ who spoke first in the audio.** The recording may start mid-conversation, Android's CallLog direction can lag, and the callee/caller might not be the first audible voice in every scenario.
- **Silent failures are worse than honest uncertainty.** A wrong but confident label caused the summary to attribute statements to the wrong person — harder to spot than an explicit `UNKNOWN`.

Direction is still used as a *tiebreaker* to promote an already-resolved `MEDIUM` greeting match to `HIGH` (rule 5), but it never initiates a role assignment on its own.

## Segment sort determinism

Speakers are assigned stable IDs (`spk_1`, `spk_2`, …) by chronological first-appearance order in the transcript. When two segments share identical timestamps (common at diarization turn boundaries due to floating-point rounding), the sort uses `(startSeconds, endSeconds, canonicalSpeakerId)` as a compound key. The string comparison of `SPEAKER_00` / `SPEAKER_01` ensures the assignment is fully deterministic across identical runs.

## Quality warnings

| Warning | Meaning |
|---|---|
| `answering_pattern_used` | Speaker role assigned via opening phrase detection |
| `speaker_roles_unresolved` | No evidence resolved either speaker; both are `UNKNOWN` |
| `positional_fallback_used` | *(Legacy — no longer emitted by the current resolver)* |
| `speaker_identity_ambiguous` | Both speakers mentioned both names; resolver refused to guess |
| `multi_party_call_not_auto_resolved` | More than 2 real speakers; untouched speakers stay `UNKNOWN` |

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
  "usedDirection": false,
  "usedPhoneFallback": false,
  "voiceEmbeddingEnabled": false,
  "voiceProfileUsed": false,
  "voiceMatchStatus": "DISABLED",
  "totalSpeakerCount": 2,
  "resolvedSpeakerCount": 2,
  "warnings": ["answering_pattern_used"]
}
```

No raw names, transcript fragments, or phone numbers appear in this block — only counts, booleans, and short warning codes.

## What this service is NOT

- Not an LLM. No prompts, no creative interpretation.
- Not a speaker identification system. We never store voiceprints in this service. (See [Voice embedding](voice-embedding.md) for the opt-in feature that does.)
- Not the place for user corrections. A future user-correction endpoint will write back with `labelSource=MANUAL`.

## Code map

| Service | File |
|---|---|
| `SpeakerNameResolutionService` | Resolver — all 8 rules in order. |
| `AnsweringPatternResolver` | Detects answering phrases in opening segments. |
| `NameMatcher` | Token-boundary-aware name matching. |
| `CallContext` | Metadata bundle (display name, contact, phone, direction). |
| `LabelSource` | Enum of evidence sources (includes `ANSWERING_PATTERN`). |
| `SpeakerRole` / `SpeakerConfidence` | Role and confidence enums. |
| `TranscriptNormalizationService` | Assigns `spk_1` / `spk_2` IDs by deterministic sort order. |

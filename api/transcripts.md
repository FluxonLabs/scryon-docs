# Transcripts

## GET `/api/calls/{id}/transcript`

Returns the normalised, speaker-attributed transcript for a completed call.

### Response — `200 OK`

```json
{
  "schemaVersion": 2,
  "callId": "f0a1d2e3-...",
  "language": "en",
  "durationSeconds": 240,
  "cleanText": "[00:00 - 00:04] Praveen: Hi Ravi, ...\n[00:04 - 00:08] Ravi: ...",
  "speakers": [
    {
      "speakerId": "spk_1",
      "sourceSpeakerId": "SPEAKER_00",
      "label": "Praveen",
      "displayName": "Praveen",
      "role": "USER",
      "confidence": "HIGH",
      "labelSource": "GREETING_MATCH",
      "voiceMatchScore": null,
      "voiceProfileMatched": null
    },
    {
      "speakerId": "spk_2",
      "sourceSpeakerId": "SPEAKER_01",
      "label": "Ravi",
      "displayName": "Ravi",
      "role": "CONTACT",
      "confidence": "MEDIUM",
      "labelSource": "BY_ELIMINATION"
    }
  ],
  "segments": [
    {
      "id": "seg_0001",
      "speaker": "Praveen",
      "speakerLabel": "Praveen",
      "speakerDisplayName": "Praveen",
      "speakerId": "spk_1",
      "sourceSpeakerId": "SPEAKER_00",
      "role": "USER",
      "startSeconds": 0.0,
      "endSeconds": 4.2,
      "text": "Hi Ravi, I'll send the revised pricing today.",
      "alignmentConfidence": "HIGH"
    }
  ],
  "speakerResolution": {
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
    "warnings": []
  },
  "pipeline": {
    "transcriptionProvider": "lemonfox",
    "transcriptionModel": "whisper-1",
    "diarizationProvider": "pyannote",
    "diarizationModel": "precision-2",
    "alignmentVersion": "1.0",
    "normalizationVersion": 3,
    "status": "COMPLETED"
  },
  "createdAt": "2026-05-29T13:00:42Z"
}
```

### Field reference

| Field | Meaning |
|---|---|
| `schemaVersion` | Currently `2`. Bumped on breaking shape changes. |
| `cleanText` | Pretty-printed transcript suitable for direct display. |
| `speakers[]` | One entry per resolved speaker. See enum tables below. |
| `segments[]` | Time-coded segments; each refers to a `speakerId`. |
| `speakerResolution` | Privacy-safe telemetry block from `SpeakerNameResolutionService`. |
| `pipeline` | Provenance — which providers and algorithm versions produced the output. |

### Enums

#### `role`

| Value | Meaning |
|---|---|
| `USER` | The authenticated user (phone owner). |
| `CONTACT` | The other party on the call. |
| `UNKNOWN` | Identity could not be determined. |

#### `confidence`

| Value | Meaning |
|---|---|
| `HIGH` | Strong evidence: e.g. a greeting addressed the other party by name. |
| `MEDIUM` | Indirect evidence (mention asymmetry, by-elimination). |
| `LOW` | Default / fallback. Always paired with `POSITIONAL_FALLBACK` or `DIARIZATION`. |

#### `labelSource`

| Value | Meaning |
|---|---|
| `DIARIZATION` | No resolution applied; raw provider speaker. |
| `USER_PROFILE` / `CONTACT_METADATA` | Strict text match on the supplied names. |
| `GREETING_MATCH` | Name appeared inside a greeting pattern. |
| `NAME_MENTION` | Name appeared elsewhere in the speaker's text. |
| `BY_ELIMINATION` | Other speaker was resolved; this is the remaining role. |
| `PHONE_FALLBACK` | Contact name missing; "Contact ending NNNN" was used. |
| `POSITIONAL_FALLBACK` | No evidence; direction-aware appearance-order guess. |
| `VOICE_EMBEDDING` | Voice profile matched this speaker as the user. |
| `AMBIGUOUS` | Both speakers reference both names; nothing assigned. |
| `MANUAL` | Future user-correction endpoint. |

### Errors

| Status | code | Cause |
|---|---|---|
| 404 | `call_not_found` | Call missing or owned by another user. |
| 422 | `call_not_completed` | Status is not `COMPLETED`. |

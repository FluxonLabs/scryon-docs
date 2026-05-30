# Privacy & security

Scryon handles voice recordings — the most sensitive medium of all. This page documents the hard contract the codebase enforces and the threat model we design against.

## Hard rules (enforced in code)

1. **Raw audio is never persisted.**
   - The uploaded audio lives in memory or in the temporary `TEMP_AUDIO` bucket for at most `OBJECT_STORAGE_TEMP_AUDIO_TTL_HOURS` (default 24h).
   - The multipart threshold is configured to keep audio in heap so it's never spilled to a temp file.
   - The `StaleTempAudioSweeper` permanently removes temp audio after the TTL.
2. **No biometric voiceprint is decoded by Scryon.**
   - When the voice-embedding feature is enabled, the provider's opaque embedding blob is stored in `user_voice_profiles.embedding_json`. Scryon never decodes, transforms, or compares vectors directly.
3. **No phone numbers in transcripts.**
   - `SpeakerNameResolutionService` emits `"Contact ending NNNN"` (last 4 digits only) when contact name is missing. The full number never appears in a transcript field.
4. **No emails / phone numbers in logs.**
   - `SafeLogSanitizer` masks both before they leave the process.
5. **No transcript text in `INFO` logs by default.**
   - `REDACT_TRANSCRIPTS=true` is the default. Transcripts are accessible through authenticated APIs, not log shippers.
6. **No PII in metrics or trace tags.**
   - Metrics tags are bounded enums and IDs.
7. **No PII in Sentry events.**
   - `BeforeSendCallback` strips request bodies, sensitive headers, and any field that fails the safe-key allowlist.
8. **No public artifact URLs.**
   - Object storage keys are owner-scoped and only accessible via authenticated REST endpoints.

These rules are **not configurable**. They are part of the source.

## Soft rules (defaults, can be overridden)

- `SCRYON_VOICE_EMBEDDING_ENABLED=false` — voice profile feature is opt-in.
- `SCRYON_DEBUG_ENDPOINTS_ENABLED=false` — owner-scoped debug endpoints are off by default.
- `MANAGEMENT_ENDPOINT_HEALTH_SHOW_DETAILS=when_authorized` — health details require auth.

## What we *do* store

| Class of data | Where | Retention |
|---|---|---|
| Raw audio | `TEMP_AUDIO` bucket | ≤ 24 hours |
| Diarization JSON | `DIARIZATION_JSON` artifact | Indefinite (until call deleted) |
| Raw Whisper response | `RAW_TRANSCRIPT_JSON` artifact | Indefinite |
| Normalized transcript | `NORMALIZED_TRANSCRIPT_JSON` artifact | Indefinite |
| Analysis JSON | `ANALYSIS_JSON` artifact | Indefinite |
| Voice embedding (opaque) | `user_voice_profiles.embedding_json` | Until user deletes |
| User profile | `users` table | Until user deletes |
| Action items | `action_items` table | Until call deleted |
| Pipeline events | `call_processing_events` table | 30 days (TODO: enforce TTL) |

## User-facing deletion

| User action | Effect |
|---|---|
| `DELETE /api/calls/{id}` | Removes the call, all artifacts, action items, processing events. |
| `DELETE /api/users/me/voice-profile` | Removes the voice profile; best-effort provider delete. |
| `DELETE /api/users/me` | Removes the user and everything they own. Best-effort Firebase user delete. |

Deletes are synchronous from the API's perspective. Artifact cleanup is committed as part of the same transaction.

## Threat model

| Threat | Mitigation |
|---|---|
| Stolen Firebase token | Short-lived tokens (1h); user can sign out remotely; backend respects revocation. |
| Compromised database backup | No raw audio is in Postgres. Transcripts are in object storage; both should be encrypted at rest. |
| Provider data leak | Audio is uploaded over TLS to providers that publish SOC 2 / ISO 27001 reports. Choose providers that match your residency requirements. |
| Malicious log shipper | PII is sanitized before lines leave the process. |
| Misconfigured CORS | Production must set `SCRYON_CORS_ALLOWED_ORIGINS` explicitly; empty default = no CORS. |
| Insider access to logs | Logs contain UUIDs, no PII; engineers cannot reconstruct call content from logs alone. |

## Third-party processors

The current pipeline sends content to:

| Provider | What | Where it runs |
|---|---|---|
| Lemonfox | Audio for transcription | EU / US (configurable). |
| pyannoteAI | Audio for diarization + voice embedding | EU. |
| OpenAI | Transcript text for analysis | US. |
| Sentry | Sanitized stack traces | Per your Sentry org. |
| Firebase (Google) | Auth tokens | Global. |

Always check each provider's current sub-processor list and DPA before enabling.

## GDPR

- Users can export their data: today via `GET /api/calls`, `GET /api/calls/{id}/transcript`, etc. A bulk export endpoint is a TODO.
- Users can delete their data via `DELETE /api/users/me`.
- Lawful basis is consent (collected by the client at sign-up + voice-profile consent UI).

## Reporting a security issue

Please email **security@scryon.app** with a description and reproduction steps. We aim to acknowledge within 24 hours. Do not file public GitHub issues for security reports.

# Data model

Scryon's relational store is Postgres. The schema is owned by Flyway migrations in `scryon-backend/src/main/resources/db/migration/`. All tables use UUID primary keys, `created_at` / `updated_at` timestamps, and per-user scoping.

## Entity-relationship diagram

```
┌────────────┐      1   ┌──────────────────────┐    1   ┌──────────────────┐
│   users    │──────────│     call_records     │────────│   action_items    │
└──────┬─────┘     N    └──────────┬───────────┘   N    └──────────────────┘
       │                           │ 1
       │ 1                         │ N
       │                  ┌────────▼───────────┐
       │ N                │   call_artifacts   │
       │                  └────────────────────┘
       │
       │ 1                ┌────────────────────┐
       └──────────────────│ user_voice_profiles│
                          └────────────────────┘
                          (0..1 per user)

         ┌──────────────────────────────┐
         │  call_processing_events       │  one row per pipeline event
         └──────────────────────────────┘
```

## Tables at a glance

| Table | Purpose | Notes |
|---|---|---|
| `users` | Authenticated user accounts. | `external_user_id` (Firebase UID) is unique. |
| `call_records` | One row per uploaded call. | Drives the state machine. Indexed on `(user_id, created_at desc)`. |
| `call_artifacts` | One row per piece of content stored in object storage. | `(call_id, artifact_type)` unique. |
| `action_items` | Extracted action items. | Owner fields capture speaker + role + display name. |
| `user_voice_profiles` | Optional voiceprint per user. | At most one row per user; `consent_version` tracks consent UX. |
| `call_processing_events` | Pipeline event log. | High-cardinality; retention policy enforced by sweeper. |

## `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Server-generated. |
| `external_user_id` | `text` UNIQUE | Firebase UID, or `local-dev`. |
| `email` | `text` | Nullable; sourced from Firebase claims. |
| `display_name` | `text` | Used by the speaker resolver. |
| `created_at` / `updated_at` | `timestamptz` | |

## `call_records`

| Column | Notes |
|---|---|
| `id` (PK) | The `callId` surfaced to clients. |
| `user_id` (FK) | Owner. |
| `title` | Free-form. |
| `contact_name` / `contact_id` / `phone_number` / `organization` | Counterparty metadata. |
| `direction` | `INCOMING` / `OUTGOING` / `UNKNOWN`. |
| `recorded_at` | Client-supplied; otherwise upload time. |
| `duration_seconds` | Best-effort. |
| `status` | State machine. |
| `error_reason` | Short opaque code on `FAILED`. |
| `created_at` / `updated_at` | |

## `call_artifacts`

| Column | Notes |
|---|---|
| `id` (PK) | |
| `call_id` (FK) | |
| `artifact_type` | Enum: `TEMP_AUDIO`, `DIARIZATION_JSON`, `RAW_TRANSCRIPT_JSON`, `NORMALIZED_TRANSCRIPT_JSON`, `ANALYSIS_JSON`. |
| `storage_key` | Logical path in object storage. See [Storage layout](storage-layout.md). |
| `content_type` | MIME type of the bytes. |
| `byte_size` | Total bytes. |
| `created_at` | |

## `action_items`

| Column | Notes |
|---|---|
| `id` (PK) | |
| `call_record_id` (FK) | |
| `title` | |
| `description` | |
| `due_date` | `date`, may be null. |
| `priority` | `low` / `medium` / `high`. |
| `status` | `OPEN` / `DONE` / `SNOOZED`. |
| `owner_speaker_id` / `owner_speaker_label` / `owner_display_name` / `owner_role` | Set from `ActionItemOwnerMapper`. |
| `source_segment_ids_json` | JSON array of source segment IDs. |
| `source_text` | Provenance for explainability. |
| `created_at` / `updated_at` / `completed_at` | |

## `user_voice_profiles`

| Column | Notes |
|---|---|
| `id` (PK) | |
| `user_id` (FK, unique) | |
| `provider` | e.g. `pyannote`. |
| `model` / `model_version` | Provenance. |
| `embedding_json` | Opaque provider blob. **Not a vector we own** — we don't decode it. |
| `consent_version` | Matches `SCRYON_VOICE_CONSENT_VERSION` at create time. |
| `sample_duration_seconds` | For UX hints. |
| `created_at` / `updated_at` | |

## `call_processing_events`

| Column | Notes |
|---|---|
| `id` (PK) | |
| `call_id` | FK-style, nullable for non-call events. |
| `user_id` | Scope. |
| `stage` | Enum from `ProcessingStage`. |
| `status` | `STARTED`, `COMPLETED`, `FAILED`, `SKIPPED`. |
| `provider` | When applicable. |
| `duration_ms` | Set by `ProcessingEventLogger` at end of stage. |
| `error_code` | Short opaque code. |
| `error_message` | Sanitized. |
| `created_at` | |

## Conventions

- **All FKs are `ON DELETE CASCADE`** when the child is owned (artifacts, events, action items).
- **No raw audio bytes are ever stored in Postgres** — only object-storage keys.
- **Timestamps are UTC**. Hibernate `time_zone=UTC` is set explicitly.
- **JSON columns use `jsonb`** so we can index and query without serialisation overhead.

See [Database migrations](../development/database-migrations.md) for how the schema evolves.

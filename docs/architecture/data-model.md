# Data model

Scryon's relational store is Postgres. The schema is owned by Flyway migrations in `scryon-backend/src/main/resources/db/migration/`. All tables use UUID primary keys, `created_at` / `updated_at` timestamps, and per-user scoping.

## Entity-relationship diagram

```mermaid
erDiagram
    users ||--o{ call_records : owns
    users ||--o| user_voice_profiles : "0..1 per user"
    users ||--o{ call_processing_events : "scoped to"
    users ||--o{ contacts : owns
    users ||--o{ topup_purchases : purchases
    call_records ||--o{ action_items : extracts
    call_records ||--o{ call_artifacts : "1 per artifact type"
    call_records ||--o{ call_processing_events : emits
    call_records |o--o| call_sentiment_summary : summarises
    contacts ||--o{ call_records : "linked via scryon_contact_id"

    users {
        uuid id PK
        text external_user_id UK "Firebase UID"
        text email
        text display_name
        text plan "FREE / PRO"
        int topup_minutes_balance
        int topup_transcripts_balance
        text account_status "ACTIVE / SUSPENDED / DISABLED"
        text fcm_token
    }
    feature_flags {
        text flag_key PK
        bool enabled
        text updated_by
    }
    admin_audit_log {
        uuid id PK
        text actor_email
        text action
        text target_type
        text target_id
    }
    topup_purchases {
        uuid id PK
        uuid user_id
        text product_sku
        int minutes_granted
        int transcripts_granted
    }
    call_records {
        uuid id PK
        uuid user_id FK
        text title
        text notes "user freeform, AND-005"
        uuid scryon_contact_id FK "nullable, links to contacts"
        text direction "INCOMING / OUTGOING / UNKNOWN"
        text status "state machine"
        timestamptz recorded_at
    }
    call_artifacts {
        uuid id PK
        uuid call_id FK
        text artifact_type "TEMP_AUDIO / DIARIZATION_JSON / ..."
        text storage_key
    }
    action_items {
        uuid id PK
        uuid call_record_id FK
        text title
        text status "OPEN / IN_PROGRESS / DONE / DISMISSED"
        text priority "LOW / MEDIUM / HIGH, nullable"
        text source "AI / MANUAL"
        text owner_role
    }
    contacts {
        uuid id PK
        uuid user_id
        text name
        text phone_number
        text email
        text notes
    }
    call_sentiment_summary {
        uuid call_record_id PK,FK
        uuid user_id
        text sentiment_overall
        text tone_overall
    }
    user_voice_profiles {
        uuid id PK
        uuid user_id FK,UK
        text provider
        jsonb embedding_json "opaque blob"
    }
    call_processing_events {
        uuid id PK
        uuid call_id
        text stage
        text status "STARTED / COMPLETED / FAILED / SKIPPED"
    }
```

## Tables at a glance

| Table | Purpose | Notes |
|---|---|---|
| `users` | Authenticated user accounts. | `external_user_id` (Firebase UID) is unique. |
| `call_records` | One row per uploaded call. | Drives the state machine. Indexed on `(user_id, created_at desc)`. |
| `call_artifacts` | One piece of content stored in object storage. | `(call_id, artifact_type)` unique. |
| `action_items` | Extracted + user-created action items. | Owner fields capture speaker + role + display name; `priority` / `source` added in V19. |
| `contacts` | User-owned address-book entries. | See [API · Contacts](../api/contacts.md). Linked to calls via `call_records.scryon_contact_id`. |
| `call_sentiment_summary` | One row per completed call, denormalising `sentiment` / `tone` for analytics. | Backs [`GET /api/analytics/vibe`](../api/analytics.md). |
| `user_voice_profiles` | Optional voiceprint per user. | At most one row per user; `consent_version` tracks consent UX. |
| `call_processing_events` | Pipeline event log. | High-cardinality; retention policy enforced by sweeper. |
| `topup_purchases` | Audit trail of top-up purchases. | See [Plans & billing](../features/plans-and-billing.md). Not yet written by a real payment webhook — `PlanUsageService.creditTopup` exists but isn't wired to an endpoint. |
| `feature_flags` | Admin-controlled runtime switches. | Uncached reads by design — see [Admin console](../admin/overview.md). |
| `admin_audit_log` | Append-only trail of admin actions. | Write-only from enforcement's perspective — never read by any enforcement path. |

## `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Server-generated. |
| `external_user_id` | `text` UNIQUE | Firebase UID, or `local-dev`. |
| `email` | `text` | Nullable; sourced from Firebase claims. Also what `AdminAuthorizationService` checks against the allowlist. |
| `display_name` | `text` | Used by the speaker resolver. |
| `fcm_token` | `text` | Device push token, registered via `PATCH /api/users/me`. Null until the client registers one. See [Push notifications](../features/push-notifications.md). |
| `plan` | `text` | `FREE` (default) or `PRO`. Added V24. See [Plans & billing](../features/plans-and-billing.md). |
| `topup_minutes_balance` / `topup_transcripts_balance` | `int` | One-time purchased/granted credit, never expires, drawn down before the base monthly allowance resets. Added V24/V25. |
| `plans_intro_shown_at` | `timestamptz`, nullable | Gates the one-time post-login Plans intro screen on Android. Added V24. |
| `account_status` | `text` | `ACTIVE` (default) / `SUSPENDED` / `DISABLED`. Added V27. See [Admin console § Account status](../admin/overview.md#account-status). |
| `account_status_reason` / `account_status_updated_at` / `account_status_updated_by` | `text` / `timestamptz` / `text` | Set together whenever an admin changes `account_status`. Added V27. |
| `created_at` / `updated_at` | `timestamptz` | |

## `call_records`

| Column | Notes |
|---|---|
| `id` (PK) | The `callId` surfaced to clients. |
| `user_id` (FK) | Owner. |
| `title` | Free-form. User-editable via `PATCH /api/calls/{id}` (AND-003). |
| `notes` | User freeform notes (AND-005 / BE-008, added V20). Distinct from the AI analysis — never generated by the LLM. |
| `contact_name` / `contact_id` / `phone_number` / `organization` | Counterparty metadata sourced from the Android call log at upload time. `contact_id` here is the platform `ContactsContract._ID`, unrelated to `scryon_contact_id`. |
| `scryon_contact_id` | Nullable FK-style link (no DB constraint) to `contacts.id` (added V18). Set by auto-assign at upload or by `PATCH /api/calls/{callId}/contact`. |
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
| `priority` | `LOW` / `MEDIUM` / `HIGH`, nullable (added V19; null on rows extracted before it existed). |
| `status` | `OPEN` / `IN_PROGRESS` / `DONE` / `DISMISSED`. Renamed from the legacy `PENDING` / `COMPLETED` two-state model in V19 — old values are back-filled, not accepted on new writes. |
| `source` | `AI` (pipeline-extracted) or `MANUAL` (user-created via `POST /api/calls/{callId}/action-items`). Added V19; back-filled to `AI` for pre-existing rows. |
| `contact_id` | Nullable, added V19 for future per-contact action-item queries. Partially indexed. |
| `owner_speaker_id` / `owner_speaker_label` / `owner_display_name` / `owner_role` | Set from `ActionItemOwnerMapper`. |
| `source_segment_ids_json` | JSON array of source segment IDs. |
| `source_text` | Provenance for explainability. |
| `created_at` / `updated_at` / `completed_at` | |

See [API · Action items](../api/action-items.md) for the full request/response contract.

## `contacts`

User-owned address-book entries, independent of Android's system contacts. Added V17.

| Column | Notes |
|---|---|
| `id` (PK) | |
| `user_id` | No FK constraint (matches existing schema convention). |
| `name` | Required. Case-insensitive match key for [auto-assignment](../api/contacts.md#auto-assignment-on-upload). |
| `phone_number` / `email` / `notes` | Optional. |
| `created_at` / `updated_at` | |

See [API · Contacts](../api/contacts.md).

## `call_sentiment_summary`

One row per completed call, denormalising the `sentiment` / `tone` fields from `ANALYSIS_JSON` so [`GET /api/analytics/vibe`](../api/analytics.md) doesn't have to deserialise every artifact on every request. Added V21.

| Column | Notes |
|---|---|
| `call_record_id` (PK, FK) | `ON DELETE CASCADE` from `call_records`. |
| `user_id` | Scope; indexed with `recorded_at` for the analytics window query. |
| `recorded_at` | Copied from the call, for windowed trend queries. |
| `sentiment_overall` / `user_sentiment` / `contact_sentiment` | Copied from `Sentiment.overall` / `userSentiment.overall` / `contactSentiment.overall`. |
| `tone_overall` / `tone_formality` / `tone_energy` / `tone_pace` | Copied from `Tone`. |
| `created_at` | |

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

## `topup_purchases`

Audit trail of top-up purchases (see [Plans & billing](../features/plans-and-billing.md)). Added V24; `transcripts_granted` added V25.

| Column | Notes |
|---|---|
| `id` (PK) | |
| `user_id` | No FK constraint (matches existing schema convention). |
| `product_sku` | e.g. `topup_150min`. |
| `minutes_granted` / `transcripts_granted` | Copied from the SKU's config at purchase time — a later price/grant change never rewrites history. |
| `amount_paid_cents` / `currency` | |
| `provider` / `provider_reference` | e.g. Play Billing / Stripe transaction id. |
| `created_at` | |

## `feature_flags`

Admin-controlled runtime switches. Added V26. See [Admin console](../admin/overview.md).

| Column | Notes |
|---|---|
| `flag_key` (PK) | `text`, not an enum — a new flag doesn't need a migration. |
| `enabled` | `boolean`, defaults `false`. |
| `updated_at` / `updated_by` | Stamped on every `PATCH /api/admin/feature-flags/{key}`. |

## `admin_audit_log`

Append-only trail of every admin console action. Added V27. See [Admin console § Audit log](../admin/overview.md#audit-log).

| Column | Notes |
|---|---|
| `id` (PK) | |
| `actor_email` | The admin who performed the action. |
| `action` | `FLAG_TOGGLE` / `CREDIT_GRANT` / `ACCOUNT_STATUS_CHANGE` / `PLAN_CHANGE`. |
| `target_type` | `"feature_flag"` or `"user"`. |
| `target_id` | Flag key or user UUID, stored as text — no FK constraint. |
| `details` | Free-form human-readable summary, not machine-parsed. |
| `created_at` | |

## Conventions

- **All FKs are `ON DELETE CASCADE`** when the child is owned (artifacts, events, action items).
- **No raw audio bytes are ever stored in Postgres** — only object-storage keys.
- **Timestamps are UTC**. Hibernate `time_zone=UTC` is set explicitly.
- **JSON columns use `jsonb`** so we can index and query without serialisation overhead.

See [Database migrations](../development/database-migrations.md) for how the schema evolves.

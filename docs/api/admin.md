# Admin

Every `/api/admin/**` route requires the caller to be on the config-driven admin allowlist (`SCRYON_ADMIN_ALLOWED_EMAILS`) — see [Admin console](../admin/overview.md) for the full model. This page is the wire contract; that page is the "what and why."

> **404, not 403.** A non-admin caller gets a plain `404 Not Found` from every route on this page — the same masking already used for [voice embedding](../features/voice-embedding.md) when its feature flag is off. The admin surface does not acknowledge its own existence to a caller who isn't on the allowlist.

> **Pagination note.** Unlike the rest of this API (`cursor + limit`, see [API overview](overview.md#pagination)), the two paginated admin endpoints below return a raw Spring Data `Page<T>` envelope (`page`/`size` query params, `content`/`totalElements`/`totalPages`/… response fields). This is deliberate — admin tooling is internal, not a public contract, and reuses the framework default rather than the app's cursor scheme.

## Feature flags

### GET `/api/feature-flags`

**Not admin-only** — any authenticated user. Returns the current value of every runtime feature flag; this is what the Android app and dashboard read to decide what UI to show (e.g. [`billing_enabled`](../features/plans-and-billing.md)).

#### Response — `200 OK`

```json
{ "flags": { "billing_enabled": false } }
```

### GET `/api/admin/feature-flags`

Admin only. Lists every flag with its last-changed metadata.

#### Response — `200 OK`

```json
[
  {
    "flagKey": "billing_enabled",
    "enabled": false,
    "updatedAt": "2026-07-08T05:49:21.795Z",
    "updatedBy": "dev-admin@test.local"
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `flagKey` | string | Free-form, not an enum — new flags don't need a schema change. |
| `enabled` | boolean | |
| `updatedAt` | datetime, nullable | Null if never toggled since being seeded. |
| `updatedBy` | string, nullable | Admin email that made the last change. |

### PATCH `/api/admin/feature-flags/{key}`

#### Request

```json
{ "enabled": true }
```

#### Response — `200 OK`

The updated flag, same shape as above. `404` if `{key}` doesn't exist — flags are seeded via migration/`FeatureFlagSeeder`, not created through this endpoint.

## Users

### GET `/api/admin/users`

Paginated, searchable list of every account.

| Query param | Default | Notes |
|---|---|---|
| `page` | `0` | |
| `size` | `50` | Clamped to 200 max. |
| `search` | *(none)* | Case-insensitive email substring match. Omit for the full list. |

#### Response — `200 OK`

```json
{
  "content": [
    {
      "id": "72ca6cd4-faad-45ca-aa56-ef9d7f03200d",
      "email": "user@example.com",
      "displayName": "Priya",
      "plan": "FREE",
      "accountStatus": "ACTIVE",
      "accountStatusReason": null,
      "topupMinutesBalance": 0,
      "topupTranscriptsBalance": 0,
      "createdAt": "2026-07-04T02:49:33.643Z",
      "lastLoginAt": "2026-07-04T02:49:33.547Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 50
}
```

(Response is trimmed above — Spring Data's `Page<T>` also includes `pageable`, `sort`, `first`, `last`, `empty`, `numberOfElements`.)

### POST `/api/admin/users/{userId}/grant-credits`

Adds an exact, admin-specified amount of top-up minutes/transcripts to an account — the production-support version of the dev-only test-credit tool. Distinct from [top-up purchases](../features/plans-and-billing.md#top-ups-free-only): no payment verification, an admin is asserting the grant directly (refunds, goodwill credits, support cases).

#### Request

```json
{ "minutes": 250, "transcripts": 10 }
```

At least one of `minutes`/`transcripts` must be positive — `400 Bad Request` otherwise. Either can be `0`/omitted to leave that dimension untouched.

#### Response — `200 OK`

The account's updated [`UploadLimitsResponse`](users.md#get-apiusersmelimits).

### PATCH `/api/admin/users/{userId}/status`

Sets ACTIVE / SUSPENDED / DISABLED — see [Admin console § Account status](../admin/overview.md#account-status) for what each means.

#### Request

```json
{ "status": "SUSPENDED", "reason": "payment overdue" }
```

`status` is required; `reason` is optional and surfaced back to the account (in the 403 body if they try to upload while suspended, and in the push notification/in-app dialog — see [Push notifications](../features/push-notifications.md)).

#### Response — `200 OK`

The updated `AdminUserSummaryResponse` (same shape as the list endpoint's rows).

### PATCH `/api/admin/users/{userId}/plan`

Moves an account between `FREE` and `PRO` directly, bypassing any payment flow.

#### Request

```json
{ "plan": "PRO" }
```

#### Response — `200 OK`

The updated `AdminUserSummaryResponse`.

## Audit log

### GET `/api/admin/audit-log`

Append-only trail of every admin action taken through the endpoints above — who did what, to what, when. Never written to by anything except this admin surface; never read by any enforcement path.

| Query param | Default |
|---|---|
| `page` | `0` |
| `size` | `50`, clamped to 200 |

#### Response — `200 OK`

```json
{
  "content": [
    {
      "id": "7065dd81-3722-445b-9e57-a8b27494fa1e",
      "actorEmail": "dev-admin@test.local",
      "action": "ACCOUNT_STATUS_CHANGE",
      "targetType": "user",
      "targetId": "b08d743d-210a-4448-8181-49bc89ab3784",
      "details": "status=SUSPENDED reason=inactivity",
      "createdAt": "2026-07-08T05:28:26.730Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

| Field | Notes |
|---|---|
| `action` | One of `FLAG_TOGGLE`, `CREDIT_GRANT`, `ACCOUNT_STATUS_CHANGE`, `PLAN_CHANGE`. |
| `targetType` | `"feature_flag"` or `"user"`. |
| `targetId` | The flag key or user UUID as a string. |
| `details` | Free-form, human-readable summary of what changed — not machine-parsed anywhere. |

Sorted most-recent-first.

## Plans

### GET `/api/plans`

**Not admin-only** — any authenticated user. Returns the current plan catalog; the Android/dashboard Plans screen renders this rather than hardcoding a price or limit.

#### Response — `200 OK`

```json
{
  "free": { "minutesPerMonth": 150, "transcriptsPerDay": 3 },
  "pro": { "priceCents": 999, "minutesPerMonth": 1000, "overageRatePerMinute": 0.025 },
  "topups": [
    { "sku": "topup_60min", "minutesGranted": 60, "transcriptsGranted": 5, "priceCents": 199 },
    { "sku": "topup_150min", "minutesGranted": 150, "transcriptsGranted": 12, "priceCents": 399 },
    { "sku": "topup_400min", "minutesGranted": 400, "transcriptsGranted": 30, "priceCents": 799 }
  ]
}
```

See [Plans & billing](../features/plans-and-billing.md) for what these numbers mean.

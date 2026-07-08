# Users

## GET `/api/users/me`

Returns the authenticated user's profile.

### Response — `200 OK`

```json
{
  "id": "449b4cd2-...",
  "externalUserId": "firebase|abc123",
  "email": "praveen@example.com",
  "displayName": "Praveen",
  "photoUrl": null,
  "createdAt": "2026-01-12T07:30:00Z",
  "lastLoginAt": "2026-07-08T05:49:33.547Z",
  "privacyPolicyVersion": "2026-07-01",
  "privacyPolicyAcceptedAt": "2026-01-12T07:31:00Z",
  "termsVersion": "2026-07-01",
  "termsAcceptedAt": "2026-01-12T07:31:00Z",
  "callRecordingDisclaimerVersion": "2026-07-01",
  "callRecordingDisclaimerAcceptedAt": "2026-01-12T07:31:00Z",
  "marketingOptIn": false,
  "marketingOptInAt": null,
  "plan": "FREE",
  "plansIntroShownAt": null,
  "isAdmin": false,
  "accountStatus": "ACTIVE",
  "accountStatusReason": null
}
```

`displayName` is critical — it's what `SpeakerNameResolutionService` uses to identify the user inside transcripts.

| Field | Type | Notes |
|---|---|---|
| `plan` | `"FREE"` \| `"PRO"` | Drives the limits in [`GET /api/users/me/limits`](#get-apiusersmelimits). See [Plans & billing](../features/plans-and-billing.md). |
| `plansIntroShownAt` | datetime, nullable | Null until the Android client's one-time post-login Plans screen has been shown. |
| `isAdmin` | boolean | True iff this account's email is on the [admin allowlist](../admin/overview.md). Not a stored field — computed per-request. |
| `accountStatus` | `"ACTIVE"` \| `"SUSPENDED"` \| `"DISABLED"` | Admin-controlled — see [Admin console § Account status](../admin/overview.md#account-status). |
| `accountStatusReason` | string, nullable | Set together with `accountStatus` by an admin. Null when `accountStatus` is `ACTIVE`. |

`UserProfileResponse` also reports first-launch consent status — see [`PATCH /api/users/me/consent`](#patch-apiusersmeconsent) below.

## PATCH `/api/users/me`

Update mutable profile fields.

### Request

```json
{ "displayName": "Praveen Kumar" }
```

### Response — `200 OK`

The updated `UserProfileResponse`.

## PATCH `/api/users/me/consent`

Records first-launch consent acceptances: privacy policy, terms of service, and the call-recording legal disclaimer, plus the (non-required) marketing-notifications opt-in.

Designed for the Android app's post-login consent flow: shown right after sign-in/registration, before the signed-in home shell, whenever `GET /api/users/me` shows this account hasn't accepted the current versions yet. Sends all three required versions at once (the user just checked all three boxes to reach this call).

### Request

```json
{
  "privacyPolicyVersion": "2026-07-01",
  "termsVersion": "2026-07-01",
  "callRecordingDisclaimerVersion": "2026-07-01",
  "marketingOptIn": true
}
```

All fields optional. Only send a version the user just accepted — the server stamps the acceptance timestamp itself (never trusts a client-supplied one) and leaves any field not included in the request unchanged. `marketingOptIn` is independent of the other three: it is not a required consent, has no version, and can be toggled from a notification-preferences screen at any time, not just during onboarding.

### Response — `200 OK`

The updated `UserProfileResponse`, including:

| Field | Type | Notes |
|---|---|---|
| `privacyPolicyVersion` / `privacyPolicyAcceptedAt` | string / datetime | Null until accepted. |
| `termsVersion` / `termsAcceptedAt` | string / datetime | Null until accepted. |
| `callRecordingDisclaimerVersion` / `callRecordingDisclaimerAcceptedAt` | string / datetime | Null until accepted. |
| `marketingOptIn` | boolean | Defaults `false`. |
| `marketingOptInAt` | datetime | Null until toggled at least once. |

## DELETE `/api/users/me`

Hard-delete the authenticated user's account.

### Response — `204 No Content`

This deletes:

- Every call record, artifact, action item, and processing event owned by the user.
- The voice profile.
- The Firebase user (best-effort, if Admin SDK is configured).

Irreversible. Intended for GDPR-style "delete my data" requests.

## GET `/api/users/me/limits`

Two independent limit systems, both surfaced here for a single client-facing "Limits" screen: the generic anti-abuse guard rails (see [`UploadAbuseGuardService`](../architecture/call-processing-pipeline.md), apply regardless of plan) and the plan-driven, billing-facing limits (see [Plans & billing](../features/plans-and-billing.md)). Both would produce a rejection on `POST /api/calls/analyze` if exceeded — a `429` for either limit system, or a `403` if the account is [suspended or disabled](../admin/overview.md#account-status). Intended for a client-side "your limits" display, not for making upload decisions itself (the server is still authoritative).

### Response — `200 OK`

```json
{
  "maxUploadsPerHour": 20,
  "uploadsThisHour": 6,
  "maxConcurrentActiveCalls": 5,
  "activeCalls": 1,
  "maxMonthlyUploadBytes": 10737418240,
  "uploadedBytesThisMonth": 1288490188,
  "plan": "FREE",
  "minutesUsedThisPeriod": 45,
  "minutesLimit": 150,
  "transcriptsToday": 1,
  "dailyTranscriptLimit": 3,
  "topupMinutesBalance": 0,
  "topupTranscriptsBalance": 0
}
```

| Field | Type | Notes |
|---|---|---|
| `maxUploadsPerHour` | int | Rolling 1-hour cap on new uploads. |
| `uploadsThisHour` | long | Uploads created by this user in the last hour. |
| `maxConcurrentActiveCalls` | int | Cap on calls in a non-terminal status at once. |
| `activeCalls` | long | This user's calls currently `QUEUED`/`PROCESSING`/`TRANSCRIBING`/`ANALYZING`. |
| `maxMonthlyUploadBytes` | long | Rolling 30-day upload volume cap, in bytes. |
| `uploadedBytesThisMonth` | long | Bytes uploaded by this user in the last 30 days. |
| `plan` | `"FREE"` \| `"PRO"` | |
| `minutesUsedThisPeriod` | long | Computed live from `call_records`, rolling 30 days — never a separate counter. |
| `minutesLimit` | int | From the [plan catalog](admin.md#get-apiplans). |
| `transcriptsToday` | long, nullable | Null for PRO — no daily rail. |
| `dailyTranscriptLimit` | long, nullable | Null for PRO. |
| `topupMinutesBalance` / `topupTranscriptsBalance` | int | One-time purchased/granted credit; see [Plans & billing § Top-ups](../features/plans-and-billing.md#top-ups-free-only). |

> While [`billing_enabled`](../features/plans-and-billing.md) is off, `POST /api/calls/analyze` never rejects for plan reasons — but this endpoint still reports the real numbers above regardless of the flag. The flag only gates *enforcement*, not this read.

> A `403` from `POST /api/calls/analyze` with error code `ACCOUNT_SUSPENDED` or `ACCOUNT_DISABLED` means the account's [admin-set status](../admin/overview.md#account-status) is blocking the request, not a plan/volume limit. See [API · Admin](admin.md) for how that status gets set.

## GET `/api/users/me/stats`

Lightweight aggregates suitable for a dashboard header.

### Response — `200 OK`

```json
{
  "totalCalls": 128,
  "callsThisWeek": 14,
  "openActionItems": 9,
  "overdueActionItems": 2,
  "completedActionItems": 87,
  "averageCallDurationSeconds": 318
}
```

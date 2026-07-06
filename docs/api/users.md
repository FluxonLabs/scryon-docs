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
  "createdAt": "2026-01-12T07:30:00Z",
  "updatedAt": "2026-05-29T12:00:00Z"
}
```

`displayName` is critical — it's what `SpeakerNameResolutionService` uses to identify the user inside transcripts.

## PATCH `/api/users/me`

Update mutable profile fields.

### Request

```json
{ "displayName": "Praveen Kumar" }
```

### Response — `200 OK`

The updated `UserProfileResponse`.

## DELETE `/api/users/me`

Hard-delete the authenticated user's account.

### Response — `204 No Content`

This deletes:

- Every call record, artifact, action item, and processing event owned by the user.
- The voice profile.
- The Firebase user (best-effort, if Admin SDK is configured).

Irreversible. Intended for GDPR-style "delete my data" requests.

## GET `/api/users/me/limits`

Configured upload guard-rail limits (see [`UploadAbuseGuardService`](../architecture/call-processing-pipeline.md)) alongside the caller's current standing against each one — the same numbers that would produce a `429` on `POST /api/calls/analyze` if exceeded. Intended for a client-side "your limits" display, not for making upload decisions itself (the server is still authoritative).

### Response — `200 OK`

```json
{
  "maxUploadsPerHour": 20,
  "uploadsThisHour": 6,
  "maxConcurrentActiveCalls": 5,
  "activeCalls": 1,
  "maxMonthlyUploadBytes": 10737418240,
  "uploadedBytesThisMonth": 1288490188
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

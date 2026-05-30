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

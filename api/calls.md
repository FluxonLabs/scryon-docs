# Calls

The calls API is the entry point of Scryon — upload an audio file, get a `callId`, poll for completion.

## POST `/api/calls/analyze`

Submit a recording for analysis.

### Request

`Content-Type: multipart/form-data` with two parts:

| Part | Type | Required | Notes |
|---|---|---|---|
| `file` | audio file | yes | `.m4a`, `.mp3`, `.wav`, `.aac`, `.ogg`. Max `MAX_FILE_SIZE` (default 50 MB). |
| `metadata` | `application/json` part | yes | The envelope below. |
| `title` | text part | no | Convenience for clients that don't want to build a JSON envelope. |

#### `metadata` envelope

```json
{
  "title": "Quarterly review",
  "contactName": "Ravi",
  "contactId": "contacts:42",
  "phoneNumber": "+91 98765 43210",
  "organization": "Acme",
  "direction": "OUTGOING",
  "recordedAt": "2026-05-29T13:00:00Z",
  "durationSeconds": 240
}
```

All fields are optional. The more you send, the better the [speaker resolution](../features/speaker-resolution.md).

### Headers

- `Authorization: Bearer …` (Firebase)
- `Idempotency-Key: …` (recommended for flaky networks)
- `Content-Type: multipart/form-data; boundary=…`

### Response — `202 Accepted`

```json
{
  "callId": "f0a1d2e3-...",
  "status": "QUEUED"
}
```

### Errors

| Status | code | Cause |
|---|---|---|
| 400 | `validation_failed` | Missing `file`, bad `metadata` JSON. |
| 401 | `auth_invalid` | See [Authentication](authentication.md). |
| 413 | `payload_too_large` | File exceeds `MAX_FILE_SIZE`. |
| 415 | `unsupported_media_type` | Audio MIME not recognised. |

## GET `/api/calls`

List the authenticated user's calls.

### Query parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | int | 50 | Max 100. |
| `cursor` | string | — | From `nextCursor` on the previous page. |
| `status` | string | — | Filter (`QUEUED`, `TRANSCRIBING`, `COMPLETED`, `FAILED`). |

### Response — `200 OK`

```json
{
  "items": [
    {
      "callId": "f0a1d2e3-...",
      "title": "Quarterly review",
      "contactName": "Ravi",
      "direction": "OUTGOING",
      "status": "COMPLETED",
      "durationSeconds": 240,
      "createdAt": "2026-05-29T13:00:00Z"
    }
  ],
  "nextCursor": "eyJjcmVhdGVk..."
}
```

## GET `/api/calls/status`

Bulk poll the status of many calls at once.

```
GET /api/calls/status?ids=f0a1d2e3-...,a1b2c3d4-...
```

### Response — `200 OK`

```json
{
  "items": [
    { "callId": "f0a1d2e3-...", "status": "COMPLETED" },
    { "callId": "a1b2c3d4-...", "status": "TRANSCRIBING" }
  ]
}
```

Cheap, idempotent, safe to poll on a 3–5 second cadence.

## GET `/api/calls/{id}`

Single call detail (no transcript / analysis — those have dedicated endpoints).

### Response — `200 OK`

```json
{
  "callId": "f0a1d2e3-...",
  "title": "Quarterly review",
  "status": "COMPLETED",
  "direction": "OUTGOING",
  "contactName": "Ravi",
  "phoneNumber": "+91 98765 43210",
  "durationSeconds": 240,
  "recordedAt": "2026-05-29T13:00:00Z",
  "createdAt": "2026-05-29T13:00:00Z",
  "errorReason": null
}
```

## DELETE `/api/calls/{id}`

Hard-delete a call, all artifacts, all action items.

### Response — `204 No Content`

Irreversible. The artifacts in object storage are deleted before the row, so a partial delete on failure simply leaves orphans for the sweeper.

## DELETE `/api/calls`

Bulk delete.

### Request

```json
{ "callIds": ["f0a1d2e3-...", "a1b2c3d4-..."] }
```

### Response — `200 OK`

```json
{
  "deleted": 2,
  "missing": 0,
  "failed": []
}
```

## Errors common to all calls endpoints

| Status | code | Cause |
|---|---|---|
| 404 | `call_not_found` | The call doesn't exist or belongs to another user. |
| 422 | `call_not_completed` | Trying to read transcript / analysis before completion. |

# API overview

Scryon exposes a small, REST-ish API over JSON. Every endpoint is documented in this section, with full request/response shapes and error semantics.

## Base URL

| Environment | URL |
|---|---|
| Production | `https://api.scryon.app` |
| Local dev | `http://localhost:8080` |

Override with the `SCRYON_PUBLIC_BASE_URL` env var if you self-host.

## Conventions

### Content types

- All request and response bodies are JSON unless explicitly stated. `Content-Type: application/json; charset=utf-8`.
- File uploads use `multipart/form-data` with a JSON `metadata` part. See [Calls](calls.md).

### IDs

UUID v4 string everywhere. Server-generated unless the endpoint explicitly accepts a client-supplied `id`.

### Timestamps

ISO-8601 with `Z` (UTC) — e.g. `2026-05-29T13:00:00Z`. Never local time.

### Null vs missing

- A field with no meaningful value is **omitted** from responses (compact).
- A field present with `null` means "we tried and the value is genuinely unknown".

### Enum casing

Enums in JSON use `UPPER_SNAKE_CASE`. Examples: `INCOMING`, `COMPLETED`, `USER`, `VOICE_EMBEDDING`.

### Pagination

List endpoints use a `cursor + limit` scheme:

```
GET /api/calls?limit=50&cursor=eyJjcmVhdGVkQXQiOiIyMDI2LTA1LTI5VDEzOjAwOjAwWiJ9
```

Response carries `nextCursor` when more pages exist.

## HTTP status codes

| Code | Meaning in Scryon |
|---|---|
| `200 OK` | Request succeeded; body in response. |
| `202 Accepted` | Request accepted; work is async. Used by `POST /analyze`. |
| `204 No Content` | Mutation succeeded; no body. |
| `400 Bad Request` | Validation failure. `ApiError` body. |
| `401 Unauthorized` | Missing/invalid Firebase token or API key. |
| `403 Forbidden` | Authenticated but not authorised (e.g. trying to read another user's call). |
| `404 Not Found` | Resource doesn't exist, or feature is disabled. |
| `409 Conflict` | Idempotency conflict (rare). |
| `413 Payload Too Large` | Audio exceeds `MAX_FILE_SIZE`. |
| `415 Unsupported Media Type` | Audio MIME not recognised. |
| `422 Unprocessable Entity` | Well-formed JSON but business rule failed. |
| `429 Too Many Requests` | Provider quota or local rate limit. |
| `5xx` | Server-side failure. The client should retry with backoff. |

## Error model

Every error has the same shape:

```json
{
  "error": {
    "code": "voice_profile_not_found",
    "message": "User has no voice profile",
    "details": {}
  }
}
```

- `code` is a stable, machine-readable identifier.
- `message` is short, human-readable; never includes PII.
- `details` is an optional object with extra structured data (e.g. field-level validation errors).

See each endpoint page for the full list of error codes it can emit.

## Idempotency

Mutating endpoints accept an `Idempotency-Key` header. The server stores `(key, response)` for 24 hours so retries return the original response — useful on flaky mobile networks.

```
POST /api/calls/analyze
Idempotency-Key: 6f9619ff-8b86-d011-b42d-00cf4fc964ff
```

## Rate limits

There are no global rate limits enforced inside Scryon today — provider quotas (Lemonfox, pyannoteAI, OpenAI) are the practical ceiling. Wrap Scryon in a reverse proxy if you need per-IP rate limiting.

## Endpoint summary

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness. |
| `POST` | `/api/calls/analyze` | Submit a recording for analysis. |
| `GET` | `/api/calls` | List the user's calls. |
| `GET` | `/api/calls/status` | Bulk poll. |
| `GET` | `/api/calls/{id}` | Call detail. |
| `GET` | `/api/calls/{id}/transcript` | Normalised transcript. |
| `GET` | `/api/calls/{id}/analysis` | Structured analysis. |
| `DELETE` | `/api/calls/{id}` | Hard delete. |
| `DELETE` | `/api/calls` | Bulk delete. |
| `GET` | `/api/actions` | Action items. |
| `PATCH` | `/api/actions/{id}` | Update an action item. |
| `GET` | `/api/users/me` | Authenticated user. |
| `PATCH` | `/api/users/me` | Update profile. |
| `DELETE` | `/api/users/me` | Delete account. |
| `GET` | `/api/users/me/stats` | User-level stats. |
| `POST` | `/api/users/me/voice-profile` | Create / replace voice profile. |
| `GET` | `/api/users/me/voice-profile/status` | Voice profile state. |
| `DELETE` | `/api/users/me/voice-profile` | Remove voice profile. |

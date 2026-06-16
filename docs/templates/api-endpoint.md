# {METHOD} `{path}`

> Template — copy this section into the appropriate `api/*.md` file when documenting a new endpoint. Delete this callout when you're done.

One-sentence description of what the endpoint does.

## Request

### Headers

| Header | Required | Notes |
|---|---|---|
| `Authorization: Bearer …` | yes | Firebase ID token. |
| `Idempotency-Key` | no | Recommended on flaky networks. |
| `Content-Type` | yes | `application/json` (or multipart, etc.). |

### Path parameters

| Name | Type | Notes |
|---|---|---|
| `id` | UUID | Identifier of the resource. |

### Query parameters

| Name | Type | Default | Notes |
|---|---|---|---|
| `limit` | int | 50 | Max 100. |

### Body

```json
{
  "field": "value"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `field` | string | yes | Description. |

## Response — `200 OK`

```json
{
  "id": "...",
  "field": "value"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Server-generated. |

## Errors

| Status | `code` | Cause |
|---|---|---|
| 400 | `validation_failed` | Field-level validation. |
| 401 | `auth_invalid` | Bad / missing token. |
| 404 | `xxx_not_found` | Resource missing or owned by another user. |

## Examples

### Successful call

```bash
curl -X POST https://api.scryon.app/api/.../{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

### Error

```bash
curl -i ... # what the user sees on the most common error
```

## Notes

- Idempotency: idempotent / not idempotent.
- Side effects: what changes in the system on success.
- Rate limits: if any.
- Privacy notes: anything sensitive.

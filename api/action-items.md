# Action items

Action items are persisted as first-class objects derived from the LLM analysis.

## GET `/api/actions`

List the authenticated user's action items.

### Query parameters

| Param | Default | Notes |
|---|---|---|
| `status` | — | `OPEN` / `DONE` / `SNOOZED`. |
| `dueBefore` | — | ISO-8601 date. |
| `dueAfter` | — | ISO-8601 date. |
| `priority` | — | `low` / `medium` / `high`. |
| `limit` | 50 | Max 100. |
| `cursor` | — | Pagination. |

### Response — `200 OK`

```json
{
  "items": [
    {
      "id": "a1b2c3d4-...",
      "callId": "f0a1d2e3-...",
      "title": "Send revised pricing",
      "description": "Revised pricing sheet by Friday",
      "priority": "high",
      "status": "OPEN",
      "dueDate": "2026-06-26",
      "ownerSpeakerId": "spk_1",
      "ownerSpeakerLabel": "Praveen",
      "ownerDisplayName": "Praveen",
      "ownerRole": "USER",
      "sourceSegmentIds": ["seg_0002"],
      "sourceText": "I'll send the revised quote by Friday (priority=high).",
      "createdAt": "2026-05-29T13:00:42Z",
      "updatedAt": "2026-05-29T13:00:42Z",
      "completedAt": null
    }
  ],
  "nextCursor": null
}
```

## PATCH `/api/actions/{id}`

Update an action item's status or due date.

### Request

```json
{
  "status": "DONE",
  "dueDate": "2026-07-01"
}
```

Either field may be omitted. Setting `status=DONE` also stamps `completedAt`.

### Response — `200 OK`

The updated `ActionItemResponse`.

### Errors

| Status | code | Cause |
|---|---|---|
| 400 | `validation_failed` | Unknown status value, invalid date. |
| 404 | `action_item_not_found` | Item missing or owned by another user. |

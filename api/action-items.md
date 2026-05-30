# Action items

Action items are persisted as first-class objects derived from the LLM analysis. Each item carries a provider-neutral **`intent`** and optional **`intentMetadata`** so the client can render launcher chips (Calendar, Gmail, dialer, …) without the backend constructing deep links.

## GET `/api/actions`

List the authenticated user's action items. Pending first, then completed; within each group, newest first.

### Response — `200 OK`

```json
[
  {
    "id": "a1b2c3d4-...",
    "callRecordId": "f0a1d2e3-...",
    "title": "Send revised pricing",
    "description": "Revised pricing sheet by Friday",
    "dueDate": "2026-06-26",
    "status": "PENDING",
    "sourceText": "priority=high; segments=seg_0002; text=\"I'll send the revised quote…\"",
    "createdAt": "2026-05-29T13:00:42Z",
    "updatedAt": "2026-05-29T13:00:42Z",
    "ownerSpeakerId": "spk_1",
    "ownerSpeakerLabel": "Speaker 1",
    "ownerDisplayName": null,
    "ownerRole": "USER",
    "sourceSegmentIds": ["seg_0002"],
    "intent": "email",
    "intentMetadata": {
      "toEmail": "alex@acme.com",
      "toName": "Alex",
      "subject": "Revised pricing sheet",
      "bodyPreview": "Attaching the revised pricing reflecting the 12-month discount we discussed."
    }
  }
]
```

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Stable row id. Use for `PATCH /api/actions/{id}`. |
| `callRecordId` | UUID | Parent call. Filter client-side for per-call views. |
| `title` | string | Short action title from the LLM. |
| `description` | string | Longer context. Nullable. |
| `dueDate` | ISO date | `YYYY-MM-DD`. Null when the transcript didn't resolve one. |
| `status` | enum | `PENDING` or `COMPLETED`. |
| `sourceText` | string | Forensic payload (priority, cited segments, excerpt). |
| `ownerSpeakerId` | string | Stable `spk_N` from the normalised transcript. |
| `ownerSpeakerLabel` | string | Display label at extraction time. |
| `ownerDisplayName` | string | Refined name when known. |
| `ownerRole` | string | `USER` / `CONTACT` / `UNKNOWN`. |
| `sourceSegmentIds` | string[] | Segment ids the LLM cited as evidence. |
| `intent` | string | Provider-neutral classification — see below. |
| `intentMetadata` | object | Typed payload for deep-link construction. All fields optional. |

## Intent classification

The LLM classifies each action item with an abstract **`intent`**. The client (Android today, others later) decides which app(s) to offer as chips.

| `intent` | Meaning | Typical chips (client-side) |
|---|---|---|
| `meeting` | Schedule a video / phone meeting | Google Calendar, Meet, Zoom, Teams |
| `email` | Send / draft an email | Gmail, default mail app |
| `call` | Phone the contact back | Dialer |
| `message` | Send a chat / SMS | WhatsApp, SMS, Telegram |
| `reminder` | Self-reminder, no other party | Calendar reminder |
| `task` | Track in a task system | Share sheet / task app |
| `none` | No launchable intent | No chips |

When the transcript was explicit about a provider ("let's hop on Zoom"), the LLM may set **`intentMetadata.providerHint`** (`meet | zoom | teams | phone` for meetings; `whatsapp | sms | telegram` for messages). This is a **hint** — the client makes the final call about which chip to show or prioritise.

### `intentMetadata` by intent

Every field is optional. The LLM is instructed never to invent emails, phone numbers, or times not grounded in the transcript.

| Intent | Typically populated fields |
|---|---|
| `meeting` | `providerHint`, `attendees: [{name, email?}]`, `proposedAt` (ISO datetime), `durationMinutes`, `title`, `location` |
| `email` | `toEmail`, `toName`, `subject`, `bodyPreview` |
| `call` | `phoneNumber`, `contactName` |
| `message` | `channel`, `phoneNumber` or `handle`, `bodyPreview` |
| `reminder` | `remindAt` (ISO datetime), `title`, `notes` |
| `task` | `title`, `notes` |
| `none` | (empty / omitted) |

## PATCH `/api/actions/{id}`

Update an action item's status. Today only `status` is settable.

### Request

```json
{ "status": "COMPLETED" }
```

`status` must be `"PENDING"` or `"COMPLETED"`.

### Response — `200 OK`

The updated `ActionItemResponse` (same shape as above, including `intent` and `intentMetadata`).

### Errors

| Status | Cause |
|---|---|
| 400 | Missing or invalid `status`. |
| 404 | Item missing or owned by another user. |

## Client integration notes

- **Chips are a client concern.** The backend classifies intent and extracts metadata; the Android app maps `intent` → list of `ChipSpec` (label + icon + `Intent` builder).
- **Completion is server-side.** After the user finishes work in the target app, they tap the checkbox → `PATCH /api/actions/{id}` with `status: COMPLETED`.
- **Legacy rows.** Items extracted before intent classification was added have `intent: null` — render no chips.
- **Privacy.** `toEmail` and `phoneNumber` are only populated when spoken in the transcript (or from call-log enrichment the user already consented to). The LLM is told to leave fields null rather than guess.

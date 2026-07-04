# Contacts

Scryon contacts are a lightweight, user-owned address book that lives independently of the Android device's system contacts. A call is linked to at most one Scryon contact via `scryonContactId`, which drives the contact's call timeline and (planned) per-contact insight rollups.

> This is distinct from the legacy `contactId` / `contactName` fields captured from the phone's call log at upload time (see [Calls · metadata envelope](calls.md#metadata-envelope)) — those describe *who the platform call log says you talked to*; a Scryon contact is *the record Scryon manages for that person*. [`PATCH /api/calls/{callId}/contact`](calls.md#patch-apicallscallidcontact) links the two.

## Auto-assignment on upload

When a call is uploaded with a `contactName` (sourced from the Android call log), the backend auto-assigns a Scryon contact **synchronously, before the pipeline dispatches**:

1. If the call already has a `scryonContactId` (e.g. idempotent retry) → skip, don't overwrite.
2. If no `contactName` was supplied → skip; the user assigns a contact manually later.
3. Look up an existing Scryon contact with the same name (case-insensitive) for this user.
   - **Match found** → assign it. No new contact is created.
   - **No match** → create a new Scryon contact (name + phone number, if the upload included one) and assign it.

This means the first call from a given phone-book contact silently creates a Scryon contact; every subsequent call from that same name reuses it. Matching is by **name only** (not phone number) — a contact who calls from a second phone number still resolves to the same Scryon contact as long as the name matches.

## GET `/api/contacts`

List all contacts for the authenticated user, sorted by name.

### Response — `200 OK`

```json
[
  {
    "id": "c1a2b3c4-...",
    "name": "Ravi Shah",
    "phoneNumber": "+91 98765 43210",
    "email": null,
    "notes": "Price-sensitive; prefers annual billing.",
    "createdAt": "2026-05-29T13:00:00Z",
    "updatedAt": "2026-05-29T13:00:00Z"
  }
]
```

## GET `/api/contacts/{id}`

Get a single contact by id.

### Errors

| Status | Cause |
|---|---|
| 404 | Contact not found or owned by another user. |

## POST `/api/contacts`

Create a contact manually.

### Request

```json
{
  "name": "Ravi Shah",
  "phoneNumber": "+91 98765 43210",
  "email": "ravi@acme.com",
  "notes": "Price-sensitive; prefers annual billing."
}
```

Only `name` is effectively required; the rest are optional.

### Response — `201 Created`

The created `ContactResponse` (same shape as the list above).

## PUT `/api/contacts/{id}`

Full replacement of a contact's fields.

### Response — `200 OK`

The updated `ContactResponse`.

### Errors

| Status | Cause |
|---|---|
| 400 | Missing or invalid fields. |
| 404 | Contact not found or owned by another user. |

## DELETE `/api/contacts/{id}`

Delete a contact. This does not delete the calls linked to it — it clears their `scryonContactId`.

### Response — `204 No Content`

### Errors

| Status | Cause |
|---|---|
| 404 | Contact not found or owned by another user. |

## Fields

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Stable row id. |
| `name` | string | Required. Case-insensitive match key for auto-assignment. |
| `phoneNumber` | string | Optional. |
| `email` | string | Optional. |
| `notes` | string | Freeform, user-authored. |
| `createdAt` / `updatedAt` | ISO datetime | |

## Related

- [Calls · `PATCH /api/calls/{callId}/contact`](calls.md#patch-apicallscallidcontact) — manually link/unlink a contact on a call.
- Code: `ContactController`, `ContactService`, `ContactAutoAssignService` (auto-assign logic runs in `com.scryon.contacts`).

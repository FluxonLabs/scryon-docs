# Delete & cancel

Two distinct user actions: **bulk delete** of completed/failed calls, and **cancel** of in-flight uploads or analysis.

## Deleting transcribed calls

Long-press any **Completed** or **Failed** card in the Transcribed tab to enter selection mode. Subsequent short-taps toggle each row; the contextual strip at the top shows the count, a `×` to clear, and a trash icon to delete. Back gesture also clears the selection.

```mermaid
flowchart LR
    A[Long-press a Completed/Failed card] --> B[Selection strip appears<br/>'N selected']
    B --> C[Short-tap more rows<br/>to toggle]
    C --> D[Tap trash icon]
    D --> E[Confirm dialog<br/>'Delete N? Cannot be undone.']
    E -->|Cancel| B
    E -->|Confirm| F[Optimistic remove<br/>state.completed -= selected]
    F --> G[DELETE /api/calls<br/>{callIds:[...]}]
    G -->|200 OK| H[Toast 'N deleted'<br/>(+ 'M still processing' if 409s)]
    G -->|network fail| I[Refresh — rows reappear]
    H --> J[refreshStatsOnly if all ok<br/>refresh if any 409]
```

### What's deletable

Only `Completed` / `Failed` rows. The backend rejects in-flight statuses with HTTP 409, so `MainShellViewModel.isDeletable()` filters them out before the user can even select them — long-pressing an in-flight row surfaces a toast explaining why.

### What's deleted server-side

Hard delete — `action_items`, `call_artifacts`, `call_records` rows + every storage object (raw transcript JSON, normalised transcript JSON, analysis JSON, legacy `TRANSCRIPT_JSON`). No soft-delete window, no undo.

### Local cleanup

`ScryonRepository.deleteCalls` removes:

- `InFlightUploadStore` entries for deleted / notFound callIds
- `DismissedCallStore` entries for deleted / notFound callIds
- `CallContentCache` files for deleted / notFound callIds

`IdempotencyKeyStore` is left alone (the 24 h key was for the *upload*, not the call).

### Bulk semantics

The backend processes each id independently — one 409 never rolls back the others. The client surfaces a mixed toast (`3 deleted · 1 still processing`) and refreshes the list so the 409'd rows come back with their real status.

### Concurrency

The repository hides the difference between "deleted by us right now" and "deleted by another device earlier" — both `deleted[]` and `notFound[]` are counted as gone for the user-visible toast.

## Cancelling uploads & analysis

Every in-flight row in the Transcribed tab has a Cancel button. The dialog and label depend on the current stage:

| Row state | Button | Effect |
|---|---|---|
| `Uploading` (synthetic row, worker hasn't reached the server) | **Cancel upload** | `WorkManager.cancelUniqueWork(...)` + remove from `UploadQueueStore`. Recording reappears under Calls. |
| `Queued / Transcribing / Analyzing / Processing` (server-side) | **Cancel analysis** | Add the callId to `DismissedCallStore` (per-uid hidden ids), remove from `InFlightUploadStore`, unmark transcribed. Polling stops; the row never returns. Server-side processing may still complete — it just won't appear in the app for this user. |

Both paths route through `MainShellViewModel.cancelCall(call)`, which decides which branch to take from the stableId prefix (synthetic upload IDs start with `scryon-upload:`).

> Scryon's REST API has **no cancel endpoint** today. "Cancel analysis" is a local hide only.

## Related

- **[Status lifecycle](status-lifecycle.md)** — state transitions and what "cancel" means at each stage.
- **[Local stores](local-stores.md)** — `DismissedCallStore`, `UploadQueueStore`, `InFlightUploadStore`.
- **[Backend delete API](../api/calls.md)** — server-side delete semantics.

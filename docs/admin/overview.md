# Admin console

Scryon has an operator surface for a small set of production-support actions: flipping runtime feature flags, looking up an account, granting goodwill credits, and suspending or disabling an account for abuse or inactivity. It lives inside [`scryon-dashboard`](../dashboard/overview.md), not a separate app.

## Who's an admin

There is no `role` column, no database table of admins, and no separate login. Admin status is a **config-driven email allowlist**:

```
SCRYON_ADMIN_ALLOWED_EMAILS=alice@scryon.app,bob@scryon.app
```

Comma-separated, case-insensitive, parsed once at startup (`AdminAuthorizationService`). An admin signs into `scryon-dashboard` exactly like any other user — same Firebase project, same login form, same `Authorization: Bearer <Firebase ID token>` — and the backend decides whether that account is an admin by checking its email against the list on every request. `GET /api/users/me` reports this back as `isAdmin` (see [API · Users](../api/users.md)), which the dashboard uses to show/hide the **Admin** nav item.

Being on the allowlist is necessary and sufficient. There's no invite flow, no per-admin permission granularity — one admin can do everything documented on this page.

## Where it lives

`scryon-dashboard`'s `/admin` route ([Dashboard overview](../dashboard/overview.md)). The client-side `isAdmin` check is a UX nicety only (hides the nav item, shows a friendly "not authorized" message) — the real authorization boundary is the backend, which 404s every `/api/admin/**` request for a non-admin caller. See the next section.

## 404, not 403

Every admin route returns a plain `404 Not Found` to a non-admin caller, not `403 Forbidden`. This mirrors the existing pattern already used for [voice embedding](../features/voice-embedding.md) when its feature flag is off: an honest `403` (or a `404` with a "FORBIDDEN"-flavored error code) tells a prober that a gated surface exists at all. A `404` with error code `NOT_FOUND` doesn't. See [API · Admin](../api/admin.md) for the exact response shape.

## What an admin can do

### Feature flags

Toggle any entry in the `feature_flags` table — today, just `billing_enabled` (see [Plans & billing](../features/plans-and-billing.md)). This is a different mechanism from the `SCRYON_*_ENABLED` environment-variable flags used elsewhere in the backend (diarization, voice embedding, audio preprocessing): those require a redeploy to change; this is a DB row an admin flips from the dashboard, live, with no restart. Reads are uncached on purpose — a direct DB read per check means no instance keeps enforcing (or not enforcing) stale state after a flag flips.

### Users: search, list, and inspect

`GET /api/admin/users` — paginated, searchable by email substring. Each row shows plan, account status, top-up balances, and last login — enough to answer a support question without touching the database directly.

### Grant credits

An exact, admin-specified top-up (minutes and/or transcripts) to any account — for refunds, goodwill credits, or unblocking a support case. Distinct from a real [top-up purchase](../features/plans-and-billing.md#top-ups-free-only): there's no payment behind it, the admin is asserting the grant directly.

### Change plan

Move an account between FREE and PRO directly, bypassing whatever payment flow exists — comping a partner or beta tester, or correcting a billing mistake.

### Account status

The account-status axis is separate from plan/billing entirely — an admin can suspend or disable an account regardless of whether `billing_enabled` is even on.

| Status | Effect | Enforced by |
|---|---|---|
| `ACTIVE` | Normal. Default for every account. | — |
| `SUSPENDED` | Blocks only new call uploads (`POST /api/calls/analyze` → `403 ACCOUNT_SUSPENDED`). Viewing existing calls, transcripts, exports, and account deletion all keep working. | First check in `PlanUsageService.checkBeforeUpload`, before the billing-flag check. |
| `DISABLED` | Blocks **every** `/api/**` request from that account (`403 ACCOUNT_DISABLED`) — a full lockout. | `AccountStatusFilter`, a security filter that runs immediately after authentication resolves, before any controller — so it preempts even the `/api/**` authenticated-request check itself. |

SUSPENDED is the soft signal (inactivity, non-payment — most of the app keeps working). DISABLED is the hard one (abuse, ToS violations — nothing works). Both accept an optional `reason` string, which is:

- Returned in the `403` body if the account tries to act anyway.
- Pushed to the account's device immediately via FCM (foreground: an in-app dialog; background: a system notification) — see [Push notifications](../features/push-notifications.md).
- Shown as a persistent banner (SUSPENDED) or a full-screen block-and-sign-out (DISABLED) the next time the Android app opens, driven by the account's own `GET /api/users/me` response — not dependent on the push having arrived.

Setting an account back to `ACTIVE` reverses all of the above and sends its own "reactivated" push.

> **Self-lockout is possible and not specially guarded against.** If an admin disables their own account, `AccountStatusFilter` locks them out of the admin console along with everything else — including the endpoint that would let them re-enable themselves. Recovery requires another admin, or direct database access.

### Audit log

Every action above writes a row to `admin_audit_log` — actor email, action type, target, a human-readable summary, and a timestamp. Queryable via the dashboard's Audit log section or [`GET /api/admin/audit-log`](../api/admin.md#get-apiadminaudit-log) directly. This is the only record of "who did this and when" — feature flags separately track `updatedBy`/`updatedAt` on the row itself, but credit grants, plan changes, and status changes have no other history.

## Related

- **[API · Admin](../api/admin.md)** — the wire contract for every endpoint above.
- **[Dashboard overview](../dashboard/overview.md)** — where the console UI lives.
- **[Plans & billing](../features/plans-and-billing.md)** — the `billing_enabled` flag and the plan/top-up system it gates.
- **[Push notifications](../features/push-notifications.md)** — how account-status/credit/plan changes reach the user's device.

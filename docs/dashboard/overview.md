# scryon-dashboard

The web counterpart to the Android app, plus the [admin console](../admin/overview.md). Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS. Same Firebase project and login as Android — a user (or admin) signs into either client with the same account and sees the same backend data.

There is no scryon-dashboard-specific backend — it talks to the same `scryon-backend` REST API documented under [API Reference](../api/overview.md), the same way the Android app does.

## Routes

| Route | Purpose |
|---|---|
| `/login` | Firebase sign-in (Google or email/password). |
| `/` | Dashboard home. |
| `/calls` | List all calls. |
| `/calls/[id]` | Call detail — transcript, analysis, action items. |
| `/contacts` | Contact management. |
| `/actions` | Action items across all calls, with status management. |
| `/settings` | Account settings. |
| `/admin` | [Admin console](../admin/overview.md) — feature flags, user management, audit log. Only reachable (and only shows up in the nav) for an allowlisted admin account; every non-admin caller gets a 404 from the backend regardless of what the client renders. |

`/`, `/calls`, `/contacts`, `/actions`, `/settings`, and `/admin` all live inside a `(dashboard)` route group wrapped in `AuthGuard` + a shared sidebar — `/login` is outside it.

## Auth

`src/lib/api.ts`'s `apiFetch()` wrapper attaches the current Firebase ID token (`Authorization: Bearer <token>`) plus the shared `X-API-Key` header to every request — the same two-header pattern documented in [Authentication](../api/authentication.md) for the Android client. `apiFetch` also attaches the HTTP status code to any thrown error (`error.status`), which is how the admin page distinguishes "not signed in" from "signed in but not an admin" (backend `404`) without parsing the error body.

## How it's built

No state-management library — every data-fetching hook (`useCalls`, `useContacts`, `useAdminUsers`, …) is the same shape: `useState` + `useEffect` + `useCallback`, calling `apiFetch()` directly. No Redux, no React Query, no SWR. A new hook for a new resource is expected to look like the existing ones, not introduce a new pattern.

## Related

- **[Admin console](../admin/overview.md)** — the `/admin` route in depth.
- **[Authentication](../api/authentication.md)** — the Firebase + API-key model this shares with Android.

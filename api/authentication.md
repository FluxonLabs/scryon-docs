# Authentication

Scryon supports two authentication mechanisms. They are independent and can be combined.

## 1. Firebase Authentication (recommended for production)

Every request to `/api/**` (except `/api/health`) must carry a valid Firebase ID token:

```
Authorization: Bearer <Firebase ID token>
```

### Setup

1. Create a Firebase project and a service account with the `Firebase Authentication Admin` role.
2. Export the service-account JSON.
3. Set these env vars on the backend:

```
FIREBASE_PROJECT_ID=scryon-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@scryon-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

When `FIREBASE_PROJECT_ID` alone is set, Scryon verifies tokens against the public JWKS. When the service account is also supplied, the Firebase Admin SDK's `verifyIdToken` is used — slightly slower but better at honouring revocation.

### What the server does

- Validates the JWT.
- Extracts `uid`, `email`, `name`.
- Finds or creates the matching row in `users`.
- Attaches a `ScryonAuthentication` to the security context for the rest of the request.

### Errors

| Status | `code` | Cause |
|---|---|---|
| 401 | `auth_missing` | No `Authorization` header. |
| 401 | `auth_invalid` | Token failed signature / expiry / audience check. |
| 403 | `auth_disabled` | Token valid but the user is disabled in Firebase. |

## 2. API key (internal / dev)

A shared-secret guard for environments without Firebase. When `SCRYON_API_KEY` is set, every request must include:

```
X-Scryon-Api-Key: <key>
```

API key alone does **not** establish a user identity — only Firebase does. The API-key guard is intended for non-user endpoints (webhooks, internal probes).

## 3. Local dev shortcut

When neither Firebase nor API key is configured, `LocalDevUserFilter` attaches a fixed `local-dev` user to every request. This filter is registered only when `FIREBASE_PROJECT_ID` is empty.

> **Never deploy with both Firebase off and API key off.** That configuration is intended exclusively for local dev.

## Ownership enforcement

Every domain controller checks the authenticated user against the resource being accessed:

- `GET /api/calls/{id}` → 404 if the call belongs to another user (we don't leak existence with 403).
- `GET /api/calls/{id}/transcript` → same.
- `DELETE /api/calls/{id}` → same.
- `GET /api/actions` → only returns the user's own action items.

There is no concept of teams or shared workspaces yet.

## Token lifecycle (mobile clients)

The Android client refreshes the Firebase ID token automatically. Long-lived sessions on mobile are fine — tokens auto-rotate on a 1-hour cadence. If you see 401s after a successful login, force-refresh:

```kotlin
firebaseAuth.currentUser?.getIdToken(true)
```

## Multi-environment auth

For Cloud Run / Railway / Fly deployments where build artifacts move across environments, prefer **separate Firebase projects per environment** (`scryon-dev`, `scryon-staging`, `scryon-prod`). Tokens issued by one project will be rejected by another, which is the safe default.

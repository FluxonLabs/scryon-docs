# Authentication

The Android client authenticates every backend call with a **Firebase ID
token** sent as `Authorization: Bearer <token>`. Firebase ID tokens expire
after ~1 hour, so the client caches and refreshes them transparently.

## Request flow

1. **`FirebaseAuthInterceptor`** attaches `Authorization: Bearer <token>` to
   every request except `/api/health`, pulling the token from
   `FirebaseIdTokenProvider`.
2. **`FirebaseIdTokenProvider`** fetches and caches the token so parallel
   requests share one value instead of each calling Firebase.
3. **`FirebaseAuthAuthenticator`** handles a `401`: it force-refreshes the token
   and retries the request once.

## Token caching (by real expiry)

`FirebaseIdTokenProvider` caches the token keyed to its **actual expiry**
(`GetTokenResult.getExpirationTimestamp()`) and refreshes a 5-minute safety
margin before that.

{% hint style="warning" %}
It must **not** use a flat "N minutes from when we cached it" TTL. Firebase can
hand back a token already partway through its 1-hour life; a cache-relative TTL
would then keep serving it **past its real expiry**, producing spurious `401`s
and "could not load" errors. Cache by the token's own expiry timestamp.
{% endhint %}

## 401 handling and graceful re-auth

On a `401`, `FirebaseAuthAuthenticator` force-refreshes and distinguishes two
outcomes:

- **Dead session** (`FirebaseAuthInvalidUserException` — revoked / disabled /
  signed-out elsewhere): the refresh cannot succeed. It raises
  `SessionExpiredNotifier`; `AuthGateViewModel` collects that and signs the user
  out, so the app **routes back to the login screen** instead of leaving them on
  a screen full of "could not load the call" errors.
- **Transient failure** (network / timeout): only the current request fails; the
  session is left intact and the next request will retry normally.

`SessionExpiredNotifier` uses `replay = 0` so a ViewModel recreated *after* a
past expiry (config change / process death) is never immediately signed back out
once the user has re-authenticated.

## Troubleshooting

- **"Could not load the call — Firebase id token has expired":** the token
  expired and either the cache served a stale one or the session is dead. Sign
  out and back in to mint a fresh session.
- **Persists right after re-login:** check the device **Date & Time is
  automatic** — a skewed clock makes every freshly-minted token look expired to
  the server, and no refresh can fix that.

## Code map

| Concern | Class |
|---------|-------|
| Attach bearer token | `com.scryon.data.remote.FirebaseAuthInterceptor` |
| Fetch + cache token by real expiry | `com.scryon.data.auth.FirebaseIdTokenProvider` |
| 401 refresh-and-retry / dead-session detection | `com.scryon.data.remote.FirebaseAuthAuthenticator` |
| Session-expired signal | `com.scryon.data.auth.SessionExpiredNotifier` |
| Sign-out + login routing | `com.scryon.viewmodel.AuthGateViewModel`, `com.scryon.data.auth.AuthRepository` |

See also: [Networking](networking.md) ·
[API › Authentication](../api-reference/authentication.md).

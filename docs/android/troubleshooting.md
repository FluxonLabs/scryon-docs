# Troubleshooting

Symptom → likely cause → fix. Start here before opening an issue.

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 — Missing or invalid X-API-Key header` | `SCRYON_API_KEY` missing or wrong | Add/replace in `local.properties`, rebuild, reinstall |
| `401 — Missing or invalid Authorization Bearer token` | App didn't attach the Firebase ID token, or the backend verifies a different Firebase project | Open **Settings → Auth diagnostics**; if no token shows, sign out + sign in. If a valid token still 401s, confirm the backend verifies Firebase project `scryon-app`. |
| Verification email never arrives | Firebase rate limit (back-to-back sends), wrong template, or Spam | Wait 60 s and tap **Resend** on `EmailVerificationScreen`; check Firebase Console → Authentication → Templates and Authorized domains; check Spam / Promotions for `noreply@scryon-app.firebaseapp.com` |
| Login screen says "Firebase is not configured" | No `google-services.json` in `app/` | Add file, rebuild |
| Google sign-in button does nothing or errors | Missing `FIREBASE_WEB_CLIENT_ID` or SHA-1 not registered in Firebase | Add web client ID and SHA-1 in Firebase Console → Project settings → Your apps → Android |
| Calls tab is empty even with recordings on device | Audio permission denied | Tap "Allow audio access" on the empty state |
| Recording reappears after Transcribe | Server returned `FAILED`; the in-flight binding is removed and `markTranscribed` is reverted | Retry |
| Polling never converges | Server `nextPollMs` outside the 1 s..60 s clamp | Inspect logcat at `OkHttp`; adjust clamp in `MainShellViewModel` if needed |
| Account deletion fails with `RECENT_LOGIN_REQUIRED` | Firebase requires fresh auth for `user.delete()` | User signs out and back in, then retries |
| Upload stops when the app is closed | Should not happen — `CallUploadWorker` runs as a foreground service. If it does, check that `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` are granted and that the user hasn't denied `POST_NOTIFICATIONS` (the worker still uploads without it but loses foreground priority) | Filter logcat by `CallUploadWorker` |
| App appears to "close" right after tapping Transcribe | Old build before the deferred-foreground fix — immediate foreground promotion was sending some OEMs to home | Reinstall current build; the worker now waits ~4 s before promoting |
| Speaker names wrong in transcript | Backend speaker resolution issue, or call-log enrichment not granted | Grant `READ_CALL_LOG` and re-upload; see [Speaker resolution](../features/speaker-resolution.md) |
| Voice profile card not visible | Backend feature flag off | Check `GET /api/users/me/voice-profile/status` → `enabled: false` means the card is hidden by design |
| Action items show wrong assignee | Call-log enrichment missing or backend resolution fallback | Grant call-log permission; re-upload with metadata |

## Debug logcat filters

```bash
# Auth / token issues
adb logcat -s FirebaseIdToken:V

# Network / API errors
adb logcat -s OkHttp:V

# Upload worker
adb logcat -s CallUploadWorker:V

# All Scryon tags
adb logcat | grep -i scryon
```

## Testing a Bearer token manually

Copy the token from **Settings → Auth diagnostics → Reveal full → Copy**, then:

```bash
curl https://api.scryon.app/api/users/me \
  -H "X-API-Key: $SCRYON_API_KEY" \
  -H "Authorization: Bearer $TOKEN"
```

A 200 with your user profile confirms both the token and the backend Firebase project match.

## Roadmap (known gaps)

Things scoped but not built yet:

- **Notification deep-link** — `EXTRA_HIGHLIGHT_RECORDING_ID` is plumbed; the Calls tab doesn't scroll-to / pulse the highlighted row.
- **Unit + UI tests** — Gradle scaffolding is in place; no tests written yet.
- **ProGuard / R8** — `minifyEnabled = false` in release.
- **Contact metadata picker UI** — `contactName` / `phoneNumber` multipart fields are supported by the repo; the picker UI doesn't capture them yet.

## Related

- **[Getting started](getting-started.md)** — first-run setup.
- **[Configuration](configuration.md)** — `local.properties` keys.
- **[Backend troubleshooting](../operations/troubleshooting.md)** — server-side issues.

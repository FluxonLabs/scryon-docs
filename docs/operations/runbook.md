# Runbook

Short, actionable recipes for the most common operational tasks. New runbooks belong here — see [templates/runbook.md](../templates/runbook.md).

## Reprocess a single call

When a call completed with bad output (e.g. wrong speaker labels after a fix is deployed) and you want to re-run the pipeline:

```sql
-- Find the call
SELECT id, user_id, status, error_reason FROM call_records WHERE id = '<callId>';

-- Reset its status
UPDATE call_records SET status = 'QUEUED', error_reason = NULL WHERE id = '<callId>';
```

The next sweep (within `SCRYON_SWEEP_INTERVAL_MS`) will pick it up. The `TEMP_AUDIO` artifact must still exist — if the TTL already swept it, the call cannot be reprocessed.

## Reprocess all calls for a user

```sql
UPDATE call_records
SET status = 'QUEUED', error_reason = NULL
WHERE user_id = '<userId>' AND status = 'COMPLETED'
  AND created_at > now() - interval '7 days';
```

> **Caution.** This re-spends provider budget. Only re-process when the artifact change is worth it.

## Force-delete a stuck call

```sql
-- Find the stuck call
SELECT id, status, updated_at FROM call_records WHERE id = '<callId>';

-- Delete via API (preferred)
curl -X DELETE https://api.scryon.app/api/calls/<callId> \
  -H "Authorization: Bearer <admin token>"

-- Or directly in SQL (cascade handles artifacts, action items, events)
DELETE FROM call_records WHERE id = '<callId>';
```

The artifacts in object storage will be reaped by the next storage sweep.

## Manually run the stale-job sweeper

The sweeper auto-runs every `SCRYON_SWEEP_INTERVAL_MS`. To force-run from JMX / actuator (when exposed) — easier to just call:

```sql
-- See stuck jobs
SELECT id, status, updated_at
FROM call_records
WHERE status IN ('QUEUED', 'TRANSCRIBING', 'ANALYZING')
  AND updated_at < now() - interval '15 minutes';

-- Manually mark them failed
UPDATE call_records
SET status = 'FAILED', error_reason = 'manual_sweep'
WHERE id IN (...);
```

## Roll the API key

```bash
# 1. Generate a new key
NEW_KEY=$(openssl rand -hex 32)

# 2. Update env in your platform (Railway / Cloud Run / etc.)
#    Leave the old key working for the rollout window.
SCRYON_API_KEY="$NEW_KEY,$OLD_KEY"

# 3. Update mobile clients / internal callers.

# 4. Once traffic on the old key is zero, drop it from env.
SCRYON_API_KEY="$NEW_KEY"
```

> Today the API-key guard accepts a single key; multi-key support is a TODO.

## Roll the webhook secret

```bash
NEW_SECRET=$(openssl rand -hex 32)

# Update SCRYON_WEBHOOK_SECRET on the backend.
# Any in-flight Lemonfox callbacks signed with the old secret will fail HMAC.
# Trigger a re-submission of stuck callback-mode calls:
UPDATE call_records SET status='QUEUED' WHERE status='TRANSCRIBING' AND ...;
```

## Disable a provider in emergency

```bash
# Disable pyannote — pipeline falls back to Lemonfox diarization.
railway variables set PYANNOTE_ENABLED=false

# Disable voice embedding entirely.
railway variables set SCRYON_VOICE_EMBEDDING_ENABLED=false

# Disable analysis (calls still get transcripts, action items skipped).
# There is no flag for this — use circuit-breaker behaviour via OpenAI key rotation if needed.
```

## Backfill / reprocess after a normalisation version bump

When `NORMALIZATION_VERSION` bumps (e.g. to fix transcript artifacts), existing `NORMALIZED_TRANSCRIPT_JSON` artifacts are still on the old version. They keep working — readers tolerate older versions — but new behaviour only applies on reprocess.

To bulk-reprocess the most recent 7 days:

```sql
UPDATE call_records SET status='QUEUED'
WHERE status='COMPLETED' AND created_at > now() - interval '7 days';
```

## Database backups

Two independent layers, so a single provider outage or a forgotten plan setting doesn't mean zero recovery options:

1. **Railway's managed Postgres backups** (dashboard-configured — verify the plan and retention window in the Railway project settings; this repo has no visibility into whether they're enabled).
2. **`backup-db.yml`** (`.github/workflows/backup-db.yml` in scryon-backend) — a scheduled GitHub Action (daily, 03:00 UTC) that runs `scripts/backup-db.sh` via `railway run --service <backend> --environment production`. That script:
   - `pg_dump`s the production database (inherits `DATABASE_URL` from the linked Railway environment — no credentials duplicated as GitHub secrets),
   - gzips it and uploads to the **same S3-compatible object storage bucket** the app already uses, under `db-backups/`,
   - prunes dumps older than 30 days (`BACKUP_RETENTION_DAYS`, overridable).
   - Can be triggered manually via `workflow_dispatch` before a risky migration or deploy.

   Requires the `RAILWAY_TOKEN_PROD` secret and `RAILWAY_SERVICE_NAME` var (already used by `deploy-prod.yml`) — no new secrets needed.

## Restore from snapshot

Postgres is the source of truth. Object storage artifacts are derivable (mostly):

- `TEMP_AUDIO` cannot be recovered after sweep.
- `RAW_TRANSCRIPT_JSON`, `NORMALIZED_TRANSCRIPT_JSON`, `ANALYSIS_JSON`, `DIARIZATION_JSON` can be recovered by reprocess **if** the temp audio still exists.

For a full restore:

1. Restore Postgres — either from Railway's managed snapshot, **or** from the latest `db-backups/scryon-backup-*.sql.gz` object (download it, `gunzip`, then `psql "$DATABASE_URL" < scryon-backup-*.sql` against a fresh database before cutting traffic over).
2. Restore object storage from versioning / replicated bucket.
3. Call `/api/health` to confirm the binary is healthy.
4. Spot-check `/api/calls` and `/api/calls/{id}/transcript` for a known call.

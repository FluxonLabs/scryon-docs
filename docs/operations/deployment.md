# Deployment

Scryon is a single Spring Boot binary. It runs anywhere Java 21 runs — Railway, Fly.io, Render, Cloud Run, AWS ECS, bare metal. This page covers the common production setup.

## Prerequisites

| Resource | Why |
|---|---|
| Postgres 15+ | State. Managed (Neon, Supabase, RDS, Crunchy) recommended. |
| S3-compatible bucket | Artifacts. R2, MinIO, AWS S3 all work. |
| Firebase project | Authentication. |
| Provider keys | Lemonfox, pyannoteAI, OpenAI. |
| Optional: Sentry, OTLP collector | Observability. |

## Build artefact

```bash
./mvnw clean package -DskipTests
ls target/scryon-backend-*.jar
```

A Dockerfile lives in the repo root. Two-stage build, distroless runtime, ~120 MB final image.

```bash
docker build -t scryon-backend:latest .
docker run -p 8080:8080 --env-file .env scryon-backend:latest
```

## Environment variables

The minimum-viable set for production:

```bash
# Core
DB_URL=jdbc:postgresql://host:5432/scryon
DB_USERNAME=...
DB_PASSWORD=...

# Auth
FIREBASE_PROJECT_ID=scryon-prod

# Providers
LEMONFOX_API_KEY=...
LLM_API_KEY=...

# Optional but recommended in prod
PYANNOTE_ENABLED=true
PYANNOTE_API_KEY=...

# Storage
OBJECT_STORAGE_PROVIDER=s3
OBJECT_STORAGE_BUCKET=scryon-prod
OBJECT_STORAGE_REGION=auto                # for Cloudflare R2
OBJECT_STORAGE_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
OBJECT_STORAGE_ACCESS_KEY=...
OBJECT_STORAGE_SECRET_KEY=...
OBJECT_STORAGE_PATH_STYLE_ACCESS=true

# Observability
SENTRY_DSN=https://...@sentry.io/123
SENTRY_ENVIRONMENT=production
```

See [Configuration reference](../getting-started/configuration.md) for the full surface.

## Railway deployment (current production)

Scryon is currently deployed on [Railway](https://railway.app).

1. Connect the GitHub repo.
2. Railway auto-detects the Dockerfile.
3. Set all environment variables in the service settings.
4. Add a managed Postgres plugin and link `DATABASE_URL` → `DB_URL`.
5. Expose port 8080.
6. Health check path: `/api/health`.

Roll-out steps:

```bash
# Railway rebuilds and rolls automatically on push to main.
git push origin main
```

## Cloud Run deployment

```bash
gcloud run deploy scryon \
  --source . \
  --region asia-south1 \
  --port 8080 \
  --memory 2Gi \
  --min-instances 1 \
  --max-instances 5 \
  --set-env-vars "DB_URL=...,LEMONFOX_API_KEY=...,..."
```

Notes:

- Set `--min-instances 1` so cold starts don't break the async worker.
- Cloud Run's request timeout is 60 minutes max — fine for the synchronous transcription mode.
- For very long calls prefer callback mode.

## Multi-instance scaling

Scryon's async pipeline uses `SELECT ... FOR UPDATE SKIP LOCKED`, so running multiple replicas safely shares the queue. No additional setup needed beyond:

- Shared Postgres.
- Shared object storage.
- A reverse proxy (Cloud Run/Railway already provide this) for sticky session affinity is **not** required.

## Database migrations

Flyway runs migrations on boot. To gate this:

```bash
# Run migrations in CI, not at app boot
FLYWAY_ENABLED=false
```

Then run migrations explicitly:

```bash
mvn flyway:migrate -Dflyway.url=$DB_URL -Dflyway.user=$DB_USERNAME -Dflyway.password=$DB_PASSWORD
```

See [Database migrations](../development/database-migrations.md).

## Health probes

| Probe | Endpoint | Expected |
|---|---|---|
| Startup | `GET /actuator/health` | 200, status `UP` |
| Liveness | `GET /api/health` | 200, body `{status:"ok"}` |
| Readiness | `GET /actuator/health/readiness` | 200, status `UP` |

## Hardening

Recommended before going public:

- Put `/actuator/prometheus` behind a reverse-proxy ACL or IP allowlist.
- Set `SCRYON_API_KEY` to require a shared-secret on internal webhooks.
- Set `MANAGEMENT_ENDPOINT_HEALTH_SHOW_DETAILS=when_authorized` (default).
- Set `LOGGING_LEVEL_COM_SCRYON=INFO` (avoid `DEBUG` in prod).
- Ensure `REDACT_TRANSCRIPTS=true` (default).
- Set up Sentry alerts on the `scryon.calls.failed` metric.

## Rollback

The binary is stateless and migrations are forward-only. Rollback strategy:

1. Re-deploy the previous container image (Railway/Cloud Run keeps history).
2. Migrations that touched data may need explicit `flyway:undo` or a follow-up migration — **never** edit applied migrations.
3. Artifacts written by the new version remain readable by the old version (backward-compatible schemas are a hard rule).

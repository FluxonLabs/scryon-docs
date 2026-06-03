# Local setup

A walk-through for setting up a complete local development environment.

## System requirements

| Tool | Version | Why |
|---|---|---|
| Java | 21+ | Service runtime. |
| Maven | 3.9+ | Wrapper (`./mvnw`) is checked in but a system Maven works too. |
| Docker | any recent | Postgres via `docker compose`. |
| ffmpeg | 4.4+ | Audio preprocessing; pipeline degrades gracefully if missing. |
| `jq` | any | Comfortable JSON exploration from `curl`. |

## Clone

```bash
git clone https://github.com/FluxonLabs/scryon-backend.git
cd scryon-backend
```

## Profiles

Scryon ships four Spring profiles for different scenarios:

| Profile | Activated by | DB | Storage | Transcription | Swagger | Log level |
|---------|-------------|-----|---------|--------------|---------|-----------|
| `local` | `@ActiveProfiles("local")` in tests | H2 in-memory | Local FS | Sync | on | DEBUG |
| `dev` | `SPRING_PROFILES_ACTIVE=dev` | Postgres (docker-compose) | Local FS | Sync | on | DEBUG |
| `staging` | Railway staging env var | Railway Postgres | S3/R2 | Async webhook | on | DEBUG |
| `prod` | Railway prod env var | Railway Postgres | S3/R2 | Async webhook | off | INFO |

**For local device testing, use the `dev` profile.** It connects to Postgres via docker-compose and runs transcription synchronously — no public URL or HMAC secret needed.

The `local` profile (H2 + no Flyway) is for unit and integration tests only.

## Running locally (dev profile)

### Quickest way — `dev.sh`

```bash
./dev.sh              # without pyannote (Lemonfox built-in diarization)
./dev.sh --pyannote   # with pyannote (precise speaker separation, requires PYANNOTE_API_KEY)
```

The script handles everything: starts Postgres if not running, prints the Mac's Wi-Fi IP for `local.properties`, and launches the backend with `SPRING_PROFILES_ACTIVE=dev`.

**One-time setup — create `.env.local`** (gitignored, never commit):

```bash
# scryon-backend/.env.local
export LEMONFOX_API_KEY=your-key
export LLM_API_KEY=your-key
# export PYANNOTE_API_KEY=your-key   # only needed for --pyannote
```

`dev.sh` sources this automatically every time.

### Diarization modes

| Command | Diarization | When to use |
|---------|-------------|-------------|
| `./dev.sh` | Lemonfox built-in | Quick testing, no extra key needed |
| `./dev.sh --pyannote` | pyannote.ai | Testing speaker separation accuracy |

### Manual run (if you prefer explicit commands)

```bash
# Start Postgres
docker compose up postgres -d

# Start backend with dev profile
LEMONFOX_API_KEY=<key> LLM_API_KEY=<key> SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run

# With pyannote
LEMONFOX_API_KEY=<key> LLM_API_KEY=<key> PYANNOTE_API_KEY=<key> PYANNOTE_ENABLED=true \
  SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

On first start Flyway runs all migrations and creates all tables. See [Database migrations](../development/database-migrations.md).

## Provider credentials

| Provider | Required for | Env var |
|---|---|---|
| [Lemonfox](https://lemonfox.ai) | Transcription | `LEMONFOX_API_KEY` |
| [pyannoteAI](https://pyannote.ai) | Diarization + voice profiles | `PYANNOTE_API_KEY`, `PYANNOTE_ENABLED=true` |
| [OpenAI](https://platform.openai.com) | LLM analysis | `LLM_API_KEY` |
| Firebase | Auth in staging/prod | `FIREBASE_PROJECT_ID` (and optionally service-account credentials) |

In dev, Firebase is disabled by default (`FIREBASE_PROJECT_ID` is empty) — a fixed `Local Dev` user is attached to every request so per-user scoping still works.

## Object storage

The `dev` profile defaults to local filesystem (`OBJECT_STORAGE_PROVIDER=local`). Artifacts are written to `./var/storage-dev` under the repo root, mirroring the S3 key layout. No credentials needed.

To test against real S3/R2 locally, set `OBJECT_STORAGE_PROVIDER=s3` and fill in the bucket/endpoint/key variables from `.env.example`.

## Connecting a physical Android device

The `devDebug` Android flavor points to `DEV_BASE_URL` in `local.properties`. Set this to your Mac's LAN IP:

```bash
ipconfig getifaddr en0    # e.g. 192.168.1.105
```

Then in `Scryon/local.properties`:
```properties
DEV_BASE_URL=http://192.168.1.105:8080/
```

The dev flavor's `network_security_config.xml` already permits cleartext HTTP, so no further Android config is needed.

## Run tests

```bash
./mvnw test
```

Integration tests use the `local` profile (H2 in-memory) — no Docker required.

## Useful endpoints during dev

| URL | Purpose |
|---|---|
| `http://localhost:8080/swagger-ui.html` | OpenAPI explorer (dev + staging only) |
| `http://localhost:8080/api/health` | Liveness check |
| `http://localhost:8080/api/debug/calls/{id}/events` | Pipeline event log (dev + staging only) |
| `http://localhost:8080/actuator/prometheus` | Prometheus scrape endpoint |
| `http://localhost:8080/v3/api-docs` | Raw OpenAPI spec |

## What's next

- [Configuration reference](configuration.md) — every env var.
- [Coding conventions](../development/coding-conventions.md) before submitting your first change.

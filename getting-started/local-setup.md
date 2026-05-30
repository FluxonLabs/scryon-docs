# Local setup

A walk-through for setting up a complete local development environment.

## System requirements

| Tool | Version | Why |
|---|---|---|
| Java | 21+ | Service runtime. |
| Maven | 3.9+ | Wrapper (`./mvnw`) is checked in but a system Maven works too. |
| Docker | any recent | Postgres + (optional) localstack for S3. |
| ffmpeg | 4.4+ | Audio preprocessing pipeline; the pipeline degrades gracefully if missing. |
| `jq` | any | Comfortable JSON exploration from `curl`. |

## Clone

```bash
git clone https://github.com/FluxonLabs/scryon-backend.git
cd scryon-backend
```

## Profiles

Scryon ships two Spring profiles:

| Profile | When | DB | Storage | Notes |
|---|---|---|---|---|
| `local` | unit + integration tests | H2 (in-memory) | Local filesystem under `./var/storage` | No Flyway. Used by `@ActiveProfiles("local")`. |
| *(default)* | local dev + production | Postgres | S3 / local | Flyway runs migrations. |

Activate the default profile by simply running `./mvnw spring-boot:run`. Tests run with `local`.

## Postgres

The fastest path:

```bash
docker run -d --name scryon-pg \
  -e POSTGRES_USER=scryon \
  -e POSTGRES_PASSWORD=scryon \
  -e POSTGRES_DB=scryon \
  -p 5432:5432 \
  postgres:16
```

Then either keep the default JDBC URL or override with `DB_URL`. On first start Flyway will create all tables — see [Database migrations](../development/database-migrations.md).

## Object storage

For local dev set `OBJECT_STORAGE_PROVIDER=local` (the default). Artifacts will be written to `./var/storage` under the repo root, mirroring the production S3 key layout. See [Storage layout](../architecture/storage-layout.md).

To exercise the real S3 client locally, run [localstack](https://docs.localstack.cloud/) and point the storage env vars at it.

## Provider credentials

| Provider | Required for | Env var |
|---|---|---|
| [Lemonfox](https://lemonfox.ai) | Transcription | `LEMONFOX_API_KEY` |
| [pyannoteAI](https://pyannote.ai) | Diarization + voice profile | `PYANNOTE_API_KEY`, `PYANNOTE_ENABLED=true` |
| [OpenAI](https://platform.openai.com) | Analysis (LLM) | `LLM_API_KEY` |
| Firebase | Auth (production) | `FIREBASE_PROJECT_ID` and optionally service account |

In local dev, Firebase is disabled by default — the `LocalDevUserFilter` attaches a fixed `Local Dev` user to every request so per-user scoping still works.

## Run

```bash
./mvnw spring-boot:run
```

Or build a JAR:

```bash
./mvnw clean package -DskipTests
java -jar target/scryon-backend-*.jar
```

## Run tests

```bash
./mvnw test
```

Integration tests use the `local` profile and an in-memory H2 database — no Docker required.

## Useful endpoints during dev

| URL | Purpose |
|---|---|
| `http://localhost:8080/swagger-ui.html` | Generated OpenAPI explorer |
| `http://localhost:8080/api/health` | Liveness check |
| `http://localhost:8080/actuator/prometheus` | Prometheus scrape endpoint |
| `http://localhost:8080/v3/api-docs` | Raw OpenAPI spec |

## What's next

- [Configuration reference](configuration.md) — every env var.
- [Coding conventions](../development/coding-conventions.md) before submitting your first change.

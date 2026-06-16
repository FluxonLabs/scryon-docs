# Database migrations

Scryon uses [Flyway](https://flywaydb.org/) for schema management. Every change to Postgres goes through a numbered, forward-only migration.

## Where they live

```
scryon-backend/src/main/resources/db/migration/
├── V1__init.sql
├── V2__call_records.sql
├── ...
└── V12__user_voice_profiles.sql
```

## Naming

`V{N}__{snake_case_description}.sql`:

- **`V`** prefix is mandatory.
- **`N`** is a strictly increasing positive integer.
- **Two underscores** before the description.
- **Snake case** for the description.

| Good | Bad |
|---|---|
| `V13__add_call_direction.sql` | `V13_add_call_direction.sql` (one underscore) |
| `V14__user_voice_profiles.sql` | `V014__user_voice_profiles.sql` (zero-padded) |

## Rules

### 1. Migrations are immutable once applied

**Never edit a migration that has run in any environment.** Flyway hashes each migration and refuses to start if the checksum changes. Editing breaks every existing database.

If you absolutely must change a migration (you fat-fingered a typo before merging):

```bash
flyway repair -url=$DB_URL -user=$DB_USERNAME -password=$DB_PASSWORD
```

…and then only on the affected environment, and only before anyone else has pulled the code.

### 2. Forward-only

There are no `undo` migrations. Mistakes get fixed by another migration on top.

### 3. Idempotent where possible

Prefer `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `DROP INDEX IF EXISTS`. Idempotency is the friend of repair, replay, and dev resets.

### 4. Defaults for new NOT NULL columns

Adding `NOT NULL` columns to a populated table requires a default — otherwise Postgres rejects the migration.

```sql
ALTER TABLE call_records
  ADD COLUMN IF NOT EXISTS direction varchar(16) NOT NULL DEFAULT 'UNKNOWN';
```

### 5. Big tables: separate steps

Long-running schema changes (e.g. adding an index on a large table) should be:

1. Migration A — add the column nullable / index `CONCURRENTLY`.
2. Migration B — backfill in a script (not in Flyway).
3. Migration C — enforce constraint.

Don't lock the table for hours during deploy.

## How Scryon runs migrations

- **In dev:** Flyway runs at application boot (`spring.flyway.enabled=true`). H2 tests skip Flyway and rely on `ddl-auto=create-drop`.
- **In production:** Flyway runs at boot today. For more controlled rollouts, set `FLYWAY_ENABLED=false` and run `mvn flyway:migrate` from CI.

## Writing a migration

```sql
-- V13__add_call_direction.sql
--
-- Adds the per-call direction (INCOMING / OUTGOING / UNKNOWN).
-- Default 'UNKNOWN' so legacy rows stay valid.

ALTER TABLE call_records
  ADD COLUMN IF NOT EXISTS direction varchar(16) NOT NULL DEFAULT 'UNKNOWN';

CREATE INDEX IF NOT EXISTS idx_call_records_user_direction
  ON call_records (user_id, direction);
```

Top-comment explains intent. SQL is plain Postgres.

## Local reset

```bash
# Drop and recreate the dev DB
docker exec scryon-pg psql -U scryon -d postgres -c "DROP DATABASE IF EXISTS scryon;"
docker exec scryon-pg psql -U scryon -d postgres -c "CREATE DATABASE scryon OWNER scryon;"

# Then start the app — Flyway will re-apply everything.
./mvnw spring-boot:run
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `Migration checksum mismatch for migration version N` | An applied migration was edited. | Restore the file to its original content. Never edit applied migrations. |
| `Detected resolved migration not applied to database: X` | Local file ahead of DB. | Let Flyway apply on next boot, or run `mvn flyway:migrate`. |
| `Detected applied migration not resolved locally: X` | DB ahead of local files. | Pull `main`. Don't manually delete from `flyway_schema_history`. |

# Quickstart

This guide takes you from zero to a fully analysed call in about five minutes against a locally running backend. For a production setup see [Deployment](../operations/deployment.md).

## Prerequisites

- Java 21 (`java -version`)
- Maven 3.9+ (`mvn -version`)
- Docker (for the Postgres container) **or** an existing Postgres instance
- `ffmpeg` on your `$PATH` (required for audio preprocessing)
- A `.m4a` / `.mp3` / `.wav` recording to analyse

## 1. Start dependencies

```bash
docker run -d --name scryon-pg \
  -e POSTGRES_USER=scryon \
  -e POSTGRES_PASSWORD=scryon \
  -e POSTGRES_DB=scryon \
  -p 5432:5432 \
  postgres:16
```

## 2. Configure secrets

Create a `.env` file (or export these vars) — only `LEMONFOX_API_KEY` and `LLM_API_KEY` are mandatory for the basic flow.

```bash
export LEMONFOX_API_KEY=sk-...
export LLM_API_KEY=sk-...
# Optional but recommended:
export PYANNOTE_ENABLED=true
export PYANNOTE_API_KEY=...
```

## 3. Run the backend

```bash
cd scryon-backend
./mvnw spring-boot:run
```

The server starts on `http://localhost:8080`. Confirm with:

```bash
curl -s http://localhost:8080/api/health | jq
```

## 4. Submit a call

```bash
curl -X POST http://localhost:8080/api/calls/analyze \
  -F "file=@/path/to/recording.m4a" \
  -F 'metadata={
        "title": "Demo call",
        "contactName": "Acme Corp",
        "direction": "OUTGOING"
      };type=application/json'
```

Response:

```json
{
  "callId": "f0a1d2e3-...",
  "status": "QUEUED"
}
```

## 5. Poll for completion

```bash
curl -s "http://localhost:8080/api/calls/status?ids=f0a1d2e3-..." | jq
```

Status transitions are `QUEUED → TRANSCRIBING → ANALYZING → COMPLETED`. Typical end-to-end latency for a 5-minute call is **10–40 seconds**.

## 6. Read the output

Once `status` is `COMPLETED`:

```bash
# Speaker-attributed transcript
curl -s http://localhost:8080/api/calls/$CALL_ID/transcript | jq

# Structured analysis with action items
curl -s http://localhost:8080/api/calls/$CALL_ID/analysis | jq

# Action items as first-class objects
curl -s http://localhost:8080/api/actions | jq
```

## What's next

- Read the [API overview](../api/overview.md) for the full endpoint reference.
- Understand the [pipeline](../architecture/call-processing-pipeline.md) end to end.
- Enable [voice embedding](../features/voice-embedding.md) so Scryon can name *you* in transcripts.

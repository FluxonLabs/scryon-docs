# Storage layout

Object storage holds every byte of user content Scryon ever touches. The layout is provider-agnostic — keys look the same whether the backing store is AWS S3, Cloudflare R2, MinIO, or a local filesystem.

## Key layout

```
users/{userId}/calls/{callId}/
├── temp/                                  # TEMP_AUDIO (ephemeral)
│   └── audio-{originalName}
├── diarization/
│   └── diarization.json                   # DIARIZATION_JSON
├── transcripts/
│   ├── raw.json                            # RAW_TRANSCRIPT_JSON
│   └── normalized.json                     # NORMALIZED_TRANSCRIPT_JSON
└── analysis/
    └── analysis.json                       # ANALYSIS_JSON
```

Key generation lives in `StorageKeys`, a single source of truth.

## Lifecycle

| Artifact | Lifetime | Sweep |
|---|---|---|
| `TEMP_AUDIO` | `OBJECT_STORAGE_TEMP_AUDIO_TTL_HOURS` (default 24h) | `StaleTempAudioSweeper` |
| `DIARIZATION_JSON` | Persistent | — |
| `RAW_TRANSCRIPT_JSON` | Persistent | — |
| `NORMALIZED_TRANSCRIPT_JSON` | Persistent | — |
| `ANALYSIS_JSON` | Persistent | — |

> Raw audio (`TEMP_AUDIO`) is the only privacy-sensitive blob and is **the only artifact ever deleted by sweep**. Everything else is durable and may be re-read on demand by `/api/calls/{id}/transcript`, `/api/calls/{id}/analysis`, etc.

## Provider abstraction

Implementations sit behind `ObjectStorageService`:

| Bean | When | Code |
|---|---|---|
| `LocalFileObjectStorageService` | `OBJECT_STORAGE_PROVIDER=local` | Writes under `OBJECT_STORAGE_LOCAL_PATH`. |
| `S3ObjectStorageService` | `OBJECT_STORAGE_PROVIDER=s3` | Uses the AWS SDK v2; works against any S3-compatible endpoint. |

For S3 the endpoint, region, credentials, and `pathStyleAccess` are configurable. Cloudflare R2, MinIO, Wasabi, and Backblaze B2 all work with `OBJECT_STORAGE_PATH_STYLE_ACCESS=true`.

## Privacy

- **No public keys.** Nothing in the bucket is publicly readable. Clients fetch transcripts and analysis through the REST API, which enforces ownership.
- **Presigned URLs are short-lived.** When pyannoteAI uploads, it uses a presigned PUT URL we generate just-in-time and discard.
- **No phone numbers or names in keys.** Keys are derived from UUIDs only.

## Local dev

When running locally with `OBJECT_STORAGE_PROVIDER=local` the layout under `./var/storage/` is identical to S3, so you can `ls -R var/storage` to inspect what would be stored in production.

```
var/storage/users/449b4cd2-.../calls/f0a1d2e3-.../
├── temp/audio-call.m4a
├── diarization/diarization.json
├── transcripts/raw.json
├── transcripts/normalized.json
└── analysis/analysis.json
```

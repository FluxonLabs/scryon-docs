# Troubleshooting

A diagnosis-first guide to the most common failure modes. Each section lists the **symptom**, the **most likely cause**, and the **fix**.

## Diarization-related

### "4 speakers in the transcript but the call is between 2 people"

**Likely cause.** Background noise (HVAC, traffic) misclassified by pyannote as additional speakers.

**Fix.**

1. Confirm `SCRYON_AUDIO_DENOISE_ENABLED=true`.
2. Confirm `SCRYON_DIARIZATION_HINT_TWO_SPEAKERS=true` and `direction` is set on the call.
3. Inspect:

   ```bash
   curl -s /api/calls/$CALL/transcript | jq '.speakers | length, .speakerResolution'
   ```

4. If still over-segmented, raise `SCRYON_AUDIO_DENOISE_NR_DB` to 16 dB and reprocess.

### "Diarization succeeded but every word is attributed to Speaker 1"

**Likely cause.** Diarization succeeded but the audio is mono with only one detectable speaker — typically a recording where one side wasn't captured.

**Fix.** Verify the audio yourself (`ffprobe`, listen to the file). If genuinely one-sided, the result is correct.

### Pipeline reports `PYANNOTE_FAILED_FALLBACK upload_io_http_400`

**Likely cause.** Presigned URL upload to pyannote failed. Most often: wrong `Content-Type`, encoded query string, or expired URL.

**Fix.** This was the bug pattern fixed in PR #19/#20. If it returns:

- Confirm `Content-Type: application/octet-stream` is sent on the PUT.
- Confirm `DiarizationClientConfig` is using `EncodingMode.NONE` for the upload client.
- Check pyannote dashboard for ingress errors.

## Transcript-related

### "Lots of repeated / nonsense words in the transcript"

**Likely cause.** Whisper stutter loops, phrase loops, or non-speech tags.

**Fix.** These are stripped by `TranscriptNormalizationService` (`NORMALIZATION_VERSION=3`). If you see them in an old call, **reprocess** to apply the current normalisation. For a fresh call:

- Verify `pipeline.normalizationVersion >= 3` on the transcript JSON.
- If the issue persists, raise `LEMONFOX_LANGUAGE=en` (autodetect can drift on noisy audio).

### Names are not resolved — everyone is "Speaker 1 / Speaker 2"

**Likely cause.** Missing call metadata.

**Fix.** Check the call record:

```bash
curl -s /api/calls/$CALL | jq '{contactName, phoneNumber, direction}'
```

- If both `contactName` and the user's `displayName` are missing → no text resolution possible. Without voice embedding, the positional fallback only fires when at least one name is known.
- If a name is set but resolution still produces UNKNOWN, inspect `speakerResolution.warnings` on the transcript.

### "Speaker 2's words attributed to Speaker 1"

**Likely cause.** Diarization collapsed two speakers into one, OR word-level alignment snapped boundaries incorrectly.

**Fix.**

1. Inspect `speakers[].length` on the transcript — if there's only one real speaker, diarization collapsed.
2. Check whether pyannote ran: `pipeline.diarizationProvider`. If it's `pyannote-fallback` or `lemonfox`, pyannote failed.
3. Re-run with `PYANNOTE_ENABLED=true` and a clear `direction`.

## Voice embedding

### `POST /api/users/me/voice-profile` returns 404

**Likely cause.** Feature flag is off.

**Fix.** Set `SCRYON_VOICE_EMBEDDING_ENABLED=true` and `SCRYON_VOICE_EMBEDDING_PROVIDER=pyannote`. The pyannote credentials are reused.

### Voice match consistently returns `NO_MATCH` despite a profile

**Likely cause.** Sample quality, language mismatch, or threshold too high.

**Fix.**

- Re-upload a 20–30 s sample of the user speaking in the same language as their calls.
- Lower `SCRYON_VOICE_EMBEDDING_MEDIUM_THRESHOLD` from 0.75 to 0.65 temporarily; observe the `scryon_voice_match_outcome` metric.
- If still no match, the underlying voice may differ too much (different microphone, lots of background noise). Re-record.

## Analysis

### Analysis returns empty fields

**Likely cause.** Transcript was too short or LLM returned a malformed JSON.

**Fix.**

- For calls < 15 s, this is expected — there isn't enough content.
- Otherwise, check Sentry for `ScryonAnalysisParseException`.

### Action items lose their owner

**Likely cause.** The LLM emitted an owner label that didn't match any speaker.

**Fix.** Check the row directly:

```sql
SELECT title, owner_speaker_label, owner_speaker_id, owner_display_name
FROM action_items WHERE id = '<id>';
```

If `owner_speaker_label` is set but `owner_speaker_id` is null, the mapper couldn't reconcile. The LLM is being vague — usually a sign the speaker resolution itself was weak.

## Deployment

### App fails to start with Flyway checksum mismatch

**Likely cause.** Someone edited an applied migration file.

**Fix.** **Never** edit applied migrations. Restore the file to its original content. If the change is genuinely needed, add a new migration.

If desperate:

```bash
flyway repair -url=$DB_URL -user=$DB_USERNAME -password=$DB_PASSWORD
```

Only use `repair` if you understand the consequences. It rewrites the schema-history checksums to match local files.

### App starts but `/api/health` returns 503

**Likely cause.** Postgres unreachable or under heavy load.

**Fix.** Check `actuator/health/db` (when exposed) or run a manual `SELECT 1` against `DB_URL`.

### Sentry not receiving events

**Likely cause.** `SENTRY_DSN` empty or pointed at the wrong project.

**Fix.** Test:

```bash
SENTRY_DSN=... curl https://sentry.io/api/0/projects/<org>/<project>/keys/ -H "Authorization: DSN $SENTRY_DSN"
```

## Where to look first when something is wrong

1. `event=PIPELINE` logs for the failing `callId`.
2. The transcript JSON's `speakerResolution.warnings`.
3. `call_processing_events` table for the call.
4. Sentry for any unhandled exception.
5. Prometheus `scryon_calls_failed_total{reason=...}` to see which stage exploded.

If none of the above show anything, capture the call ID and reach out in the #scryon-eng channel.

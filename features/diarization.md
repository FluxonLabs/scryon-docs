# Diarization

Diarization decides **who spoke when** — it splits the call audio into anonymous
speaker turns (`SPEAKER_00`, `SPEAKER_01`, …). It runs before naming; everything
in [Speaker resolution](speaker-resolution.md) is only as good as this step, so
on a mixed-mono phone call diarization is the make-or-break stage.

## Two backends

| Backend | Quality on phone audio | Cost | Default |
|---------|------------------------|------|---------|
| **pyannoteAI** (`precision-2`) | Strong — robust on noisy / mono telephony | Paid, per call | off |
| **Lemonfox `speaker_labels`** | Weak — often collapses a mixed-mono call to one speaker | Included with transcription | on (fallback) |

The pipeline never fails a call because diarization was unavailable: if pyannote
is off, over the duration guard, or errors out, it falls back to Lemonfox's
built-in labels.

{% hint style="info" %}
Lemonfox's diarization toggle is the request parameter **`speaker_labels`**, not
`diarization`. Sending the wrong key made Lemonfox silently skip diarization and
return `speaker: null` on every segment — the original "everything is Speaker 1"
bug. It also requires `response_format=verbose_json`.
{% endhint %}

## pyannote request shape

`POST /v1/diarize` with `{ "url": "media://scryon-{callId}", "model": "precision-2" }`,
plus **`maxSpeakers: 2`** for known-direction phone calls.

We send `maxSpeakers` (an *upper bound*), **not** `numSpeakers` (an *exact*
count):

- `numSpeakers` would force exactly 2 — wrong for a voicemail (1 speaker) and it
  would hard-clamp a 3-party call.
- `maxSpeakers` lets pyannote return 1 (voicemail / solo) or 2 (normal call) but
  never inflate background noise into phantom 3rd/4th speakers.

**Consequence to know:** because it's a ceiling, a genuine 2-party call where one
party barely speaks can still come back as **1 speaker**. That's expected
behaviour, not a crash.

## Audio sent to diarization

Diarization gets a *different* preprocessing than transcription: mono + 16 kHz +
loudnorm **only**, with no `afftdn` denoise, because aggressive noise reduction
distorts the spectral voice characteristics pyannote relies on to tell speakers
apart. See [Audio preprocessing](audio-preprocessing.md).

## Configuration

Off by default. Enable with `PYANNOTE_ENABLED=true` and `PYANNOTE_API_KEY`; all
other knobs (base URL, model, timeout, poll interval, retries, `maxAudioMinutes`
guard, two-speaker hints) have sensible defaults. Full env-var list, verification
checklist (startup + per-call logs, `DIARIZATION_JSON` artifact, pipeline block)
and rollback are in the [Configuration reference](../getting-started/configuration-reference.md).

## The accuracy ceiling: dual-channel audio

The strongest possible signal is a recording with each party on a **separate
channel** — then separation is perfect and free, and roles are known up front.
Scryon does not exploit this yet (the pipeline downmixes to mono, and channel
layout is device-dependent). It's an open investigation; the trap is telling
true dual-party audio apart from dual-mono via inter-channel correlation.

## Code map

| Concern | Class |
|---------|-------|
| pyannote client | `com.scryon.diarization.PyannoteDiarizationClient` |
| Disabled / no-op client | `com.scryon.diarization.DisabledDiarizationClient` |
| Orchestration + duration guard | `com.scryon.diarization.DiarizationService` |
| Provider-neutral result | `com.scryon.diarization.DiarizationResult` |
| Align turns ↔ transcript | `com.scryon.diarization.TranscriptAlignmentService` |

See also: [Speaker resolution](speaker-resolution.md) ·
[Transcription](transcription.md) · [Audio preprocessing](audio-preprocessing.md).

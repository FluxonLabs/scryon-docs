# Speaker resolution

How Scryon turns an anonymous transcript into one that says **"Jimmy (DocuSign)"**
and **"You"** instead of a single undifferentiated block. This is the core of
the product, so it is worth understanding end to end.

There are two separate problems, and the quality of the first caps the second:

1. **Diarization (separation)** — *who spoke when*. Splits the audio into
   anonymous speaker turns (`SPEAKER_00`, `SPEAKER_01`, …). Covered in
   [Diarization](diarization.md).
2. **Attribution (naming)** — mapping each anonymous speaker to a real identity
   (`You` / `Jimmy (DocuSign)` / `Speaker 2`). This page.

> If separation collapses a 2-party call into one speaker, no naming logic can
> recover it. Attribution is only ever as good as diarization.

## Pipeline position

```
audio
  ├─▶ Diarization            pyannote (preferred) / Lemonfox speaker_labels (fallback)
  ├─▶ Alignment              words/segments → speaker turns
  ├─▶ Normalization          stable spk_N ids, "Speaker N" labels, dedupe/merge, bubble split
  ├─▶ Voice match            pre-labels the USER from an enrolled voiceprint
  ├─▶ Deterministic naming   text + metadata rules  ◀── this page
  └─▶ Constrained LLM naming grounded, cite-or-discard, opt-in
        → transcript with speakers[] + per-segment displayName / role
```

Normalization produces clean but **anonymous** speakers — everyone is
`"Speaker 1"`, `"Speaker 2"`, … in first-appearance order. Everything below
attaches names, each stage only touching speakers the previous ones left
unresolved.

## Inputs to naming

- **Call metadata** (`CallContext`) — the authenticated user's display name, the
  saved contact name, phone number, and call direction. Any may be absent.
- **The transcript text** — what people actually said.
- **A voiceprint** of the authenticated user (opt-in; see
  [Voice embedding](voice-embedding.md)).

## How a name is pulled out — the evidence ladder

Every rule is **conservative**: when evidence is weak we leave `role = UNKNOWN`
and `displayName = null` rather than guess. Each speaker is stamped with a
`LabelSource` recording *which* rule named them, plus a confidence. Stronger
evidence runs first; later stages skip already-resolved speakers and never
downgrade a stronger label.

| # | Signal | `LabelSource` | How it decides | Confidence |
|---|--------|---------------|----------------|------------|
| 1 | **Voice-embedding match** | `VOICE_EMBEDDING` | The user's enrolled voiceprint matches exactly one diarized speaker → that speaker is the **USER**. Runs first (biometric-strong). | as scored |
| 2 | **Self-introduction** | `SELF_INTRODUCTION` | A speaker states their **own** name — *"this is Jimmy"*, *"my name is Ravi"*, *"David speaking"*, *"you're speaking with Sara"* — optionally with an org (*"…from DocuSign"* → `Jimmy (DocuSign)`). Names a party even when they aren't a saved contact. | HIGH if it matches known metadata, else MEDIUM |
| 3 | **Greeting** | `GREETING_MATCH` | A speaker greets the *other* party by a **known** name (*"Hi Praveen"*) → the greeter takes the opposite role. | HIGH (early) / MEDIUM (late) |
| 4 | **Name-mention asymmetry** | `NAME_MENTION` | One speaker mentions a known name and the other never does → opposite role. Both mention both names → **AMBIGUOUS**, no assignment. | MEDIUM |
| 5 | **By-elimination** | `BY_ELIMINATION` | Two-party call, one side resolved → the other takes the remaining role. | MEDIUM |
| 6 | **Direction tiebreaker** | *(promotes)* | Call direction only *promotes* an already-evidenced MEDIUM to HIGH; it never assigns a name by itself. | — |
| 7 | **Answering pattern** | `ANSWERING_PATTERN` | Both still unknown → the party who opens with *"Hello?"*, *"Yes?"*, *"Speaking"* is the one who **received** the call → CONTACT. | MEDIUM |
| 8 | **Positional fallback** | *(roles stay UNKNOWN)* | Two unknown speakers, no evidence → we deliberately do **not** guess from direction; roles stay UNKNOWN with a quality warning. | — |
| 9 | **Phone fallback** | `PHONE_FALLBACK` | Contact name missing but a phone number is present → CONTACT is labelled `"Contact ending NNNN"` (last four digits only). | — |
| 10 | **Constrained LLM naming** | `LLM_INFERENCE` | Opt-in final pass for speakers the rules couldn't resolve (see below). | model's, capped |

### Hard rules that never bend

- No name is ever **invented**.
- A phone number never appears in a label beyond the **last four digits**.
- **Direction alone never** assigns a label — only breaks ties behind real evidence.
- A name that is only used to **address** someone doesn't rename the speaker who
  said it: *"Hi Praveen"* does not make the greeter be Praveen.

## The constrained LLM naming pass

Enabled with `scryon.llm.speaker-naming-enabled` (`LLM_SPEAKER_NAMING_ENABLED`),
**off by default**. It runs *after* the deterministic rules, only when a real
speaker is still unresolved / low-confidence, and is kept on a tight leash so it
can never inject a hallucinated name:

- **Cite-or-discard** — for every name the model must quote a **verbatim** line;
  the server re-verifies that the quote (a) actually appears in *that* speaker's
  turns and (b) contains the assigned name. Un-grounded suggestions are dropped.
- **Never overrides** a HIGH-confidence deterministic label (voice /
  self-introduction / greeting).
- **Ignores** low-confidence suggestions; **rejects** generic ("Speaker 2") /
  blank names; **never mints a second USER**.
- **Never throws** — any failure keeps the deterministic transcript unchanged.

## Segmentation — why the transcript reads as tidy bubbles

Each rendered bubble is a normalized segment. Two forces shape them:

- **Speaker turns** — a change of speaker always starts a new segment, so a
  well-diarized 2-party call breaks naturally into per-turn bubbles.
- **Oversized-turn splitting** — when diarization returns a *single* speaker for
  a whole call (mono audio, a monologue / voicemail, or a separation miss), the
  merged turn is split at sentence boundaries into ≤ ~200-character bubbles with
  interpolated timestamps, so it never renders as one wall of text. This is a
  readability safety net — it does **not** create speakers; real separation
  still comes from diarization.

## What the client renders

The backend emits, per speaker and per segment: a stable `spk_N` id, a generic
`speakerLabel` (`"Speaker 1"`), an optional refined `speakerDisplayName`
(`"Jimmy (DocuSign)"`), and a `role` (USER / CONTACT / UNKNOWN). The Android
transcription screen prefers **`speakerDisplayName` → `speakerLabel` →
role-derived** (`"You"` / `"Caller"` / `"Speaker"`), groups consecutive
same-speaker turns under one header + avatar, and places USER on the right,
CONTACT on the left.

## Reprocessing existing calls

The `reanalyze` endpoint (dev/staging) rebuilds the normalized transcript from a
call's **stored raw provider outputs** (`RAW_TRANSCRIPT_JSON` +
`DIARIZATION_JSON`) and re-runs alignment → naming with the current code — so
pipeline improvements reach existing calls with **no new provider calls** — then
re-analyzes.

{% hint style="warning" %}
Audio is not retained, so `reanalyze` cannot re-transcribe or re-diarize from
scratch. A call that never captured pyannote diarization (for example, one
processed while the pyannote quota was exhausted) cannot gain it via reanalyze —
**re-import the recording** to run the full pipeline.
{% endhint %}

## Code map

| Concern | Class |
|---------|-------|
| Deterministic naming | `com.scryon.speakers.SpeakerNameResolutionService` |
| Self-introduction extraction | `com.scryon.speakers.SelfIntroductionResolver` |
| Answering-pattern detection | `com.scryon.speakers.AnsweringPatternResolver` |
| Name matching helpers | `com.scryon.speakers.NameMatcher` |
| Constrained LLM naming | `com.scryon.speakers.LlmSpeakerNamingService`, `SpeakerNamingPrompt`, `SpeakerNamingMerger` |
| Evidence labels | `com.scryon.speakers.LabelSource` |
| Voice match | `com.scryon.voice.VoiceMatchService` |
| Orchestration | `com.scryon.calls.CallProcessingService#buildAndRefineTranscript` |

## Recent changes

- **Self-introduction naming** — name a party from what they say about
  themselves, even when not a saved contact (`SELF_INTRODUCTION`).
- **Constrained LLM naming** — grounded, cite-or-discard LLM pass for
  still-unresolved speakers (`LLM_INFERENCE`), off by default.
- **Oversized-turn splitting** — single-speaker calls no longer render as one
  block.

See also: [Diarization](diarization.md) · [Voice embedding](voice-embedding.md) ·
[Call processing pipeline](../architecture/call-processing-pipeline.md).

# Analysis

## GET `/api/calls/{id}/analysis`

Returns the structured business analysis for a completed call.

> The shape is **open-ended**. Every field is optional and the LLM may emit additional keys without breaking older clients. Top-level keys documented below are pinned in code; everything else passes through.

### Response — `200 OK`

```json
{
  "schemaVersion": 3,
  "callType": "sales",
  "suggestedTitle": "Pricing follow-up with Alex",
  "oneLineSummary": "Discussed Q3 roadmap and follow-up demo on Friday.",
  "executiveSummary": "The call covered the upcoming product launch, the customer's pricing concerns, and a follow-up demo scheduled for Friday at 11am PT.",
  "executiveSummaryBullets": [
    {
      "header": "Pricing Discussion",
      "startTimestamp": "04:12",
      "paragraphs": [
        "The customer raised pricing as a blocker for procurement, pushing back on the $99/seat tier as high for their team size."
      ]
    },
    {
      "header": "Next Steps Agreed",
      "startTimestamp": "11:03",
      "paragraphs": [
        "A Friday demo was scheduled with procurement present, and a revised quote was agreed to be sent by Wednesday."
      ]
    }
  ],
  "conversationOutcome": "Agreed on Friday demo; revised pricing to be sent by Wednesday.",
  "sections": [
    {
      "id": "sec_001",
      "title": "Customer Pain Points",
      "type": "concern",
      "summary": "Pricing above $99/seat is a blocker.",
      "items": [
        {
          "text": "Quote needs to come down at least 10% to clear procurement.",
          "importance": "high",
          "speaker": "Speaker 2",
          "sourceSegmentIds": ["seg_0012", "seg_0014"]
        }
      ]
    }
  ],
  "keyDiscussionPoints": [
    {
      "text": "Greeting and brief catch-up on the prior demo.",
      "topic": "Catch-up",
      "phase": "opening",
      "importance": "low",
      "sourceSegmentIds": ["seg_0001"]
    },
    {
      "text": "Customer pushed back on the $99/seat tier.",
      "topic": "Pricing",
      "phase": "middle",
      "speakerId": "spk_2",
      "speakerLabel": "Speaker 2",
      "speakerRole": "CONTACT",
      "importance": "high",
      "sourceSegmentIds": ["seg_0012", "seg_0014"]
    },
    {
      "text": "Agreed on a Friday demo and a revised quote by Wednesday.",
      "topic": "Next steps",
      "phase": "closing",
      "speakerId": "spk_1",
      "speakerLabel": "Speaker 1",
      "speakerRole": "USER",
      "importance": "high",
      "sourceSegmentIds": ["seg_0021", "seg_0015"]
    }
  ],
  "actionItems": [
    {
      "title": "Send Friday demo invite",
      "description": "Calendar invite to alex@example.com with Zoom link.",
      "ownerSpeaker": "Speaker 1",
      "ownerSpeakerId": "spk_1",
      "ownerSpeakerLabel": "Speaker 1",
      "ownerDisplayName": null,
      "ownerRole": "USER",
      "dueDate": "2026-05-23",
      "priority": "high",
      "sourceSegmentIds": ["seg_0021"],
      "intent": "meeting",
      "intentMetadata": {
        "providerHint": "zoom",
        "attendees": [{"name": "Alex", "email": "alex@example.com"}],
        "proposedAt": "2026-05-23T11:00:00",
        "durationMinutes": 30,
        "title": "Q3 roadmap demo"
      }
    }
  ],
  "followUps": [],
  "nextSteps": [
    {
      "text": "Prepare the presentation deck for tomorrow's review",
      "ownerSpeaker": "Speaker 1",
      "when": "tomorrow",
      "sourceSegmentIds": ["seg_0018"]
    }
  ],
  "importantDates": [],
  "decisions": [],
  "commitments": [],
  "openQuestions": [],
  "risks": [],
  "opportunities": [],
  "peopleMentioned": [],
  "numbersAndAmounts": [],
  "sentiment": {
    "overall": "positive",
    "score": 0.55,
    "reason": "Customer is engaged and ready to buy once pricing is resolved.",
    "userSentiment":    {"overall": "positive", "score": 0.5, "notes": "Confident, focused on next steps."},
    "contactSentiment": {"overall": "positive", "score": 0.6, "notes": "Cooperative; pricing remains the only friction."},
    "progression": [
      {"phase": "opening", "overall": "neutral",  "note": "Brief catch-up",                  "sourceSegmentIds": ["seg_0001"]},
      {"phase": "middle",  "overall": "mixed",    "note": "Pricing pushback",                "sourceSegmentIds": ["seg_0012"]},
      {"phase": "closing", "overall": "positive", "note": "Agreement on demo and quote",     "sourceSegmentIds": ["seg_0021"]}
    ],
    "emotionalSignals": ["confident", "cooperative"]
  },
  "tone": {
    "overall": "professional",
    "descriptors": ["measured", "cooperative"],
    "formality": "semi-formal",
    "energy": "medium",
    "pace": "normal",
    "notes": "Both speakers stayed polite; brief escalation during pricing.",
    "byParty": {
      "userTone":    {"overall": "supportive",    "descriptors": ["calm",   "explanatory"], "notes": "Stayed measured even when pushed."},
      "contactTone": {"overall": "transactional", "descriptors": ["direct", "task-focused"], "notes": "Pragmatic and to the point."}
    }
  },
  "tags": ["sales", "roadmap", "pricing"],
  "qualityWarnings": [],

  "shortSummary": "Discussed Q3 roadmap and follow-up demo on Friday.",
  "detailedSummary": "The call covered the upcoming product launch, the customer's pricing concerns, and a follow-up demo scheduled for Friday at 11am PT.",
  "keyPoints": [
    "Quote needs to come down at least 10% to clear procurement."
  ]
}
```

### Top-level fields

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | `3`. v1/v2 artifacts are still served unchanged in their original shape. |
| `callType` | string | `personal \| business \| sales \| support \| interview \| finance \| healthcare \| legal \| education \| unknown \| other` |
| `suggestedTitle` | string | Headline. |
| `oneLineSummary` | string | A single sentence. Mirrored as `shortSummary` for legacy clients. |
| `executiveSummary` | string | 2–4 sentence headline prose. Mirrored as `detailedSummary` for legacy clients. |
| `executiveSummaryBullets` | `SummaryBullet[]` | **v3** — 3–6 blog-post sections (`header`, `startTimestamp`, `paragraphs[]`) that are the primary detailed summary. Pre-v3 artifacts use the old flat-bullet shape — see [`SummaryBullet`](#summarybullet) below. |
| `conversationOutcome` | string | What was decided / resolved. |
| `sections` | `Section[]` | Open-ended, model-defined thematic groupings. |
| `keyDiscussionPoints` | `DiscussionPoint[]` | **v2** — chronological bullet view of the call's discussion flow. |
| `actionItems` | `ActionItem[]` | Snapshot of discrete, launchable action items at analysis time. Prefer [`/api/actions`](action-items.md) for editable state. |
| `nextSteps` | `NextStep[]` | **v3** — planned progression / "I'll do X" statements, split out from `actionItems`. Not launchable, not persisted to Postgres — see [Features · Next steps vs. action items](../features/analysis.md#next-steps-vs-action-items). |
| `followUps` / `importantDates` / `decisions` / `commitments` / `openQuestions` / `risks` / `opportunities` / `peopleMentioned` / `numbersAndAmounts` | typed arrays | All optional; empty when the model has no evidence. `followUps` predates `nextSteps` and is no longer actively populated by the prompt — treat `nextSteps` as current. |
| `sentiment` | `Sentiment` | **v2 extended** — polarity, score, per-party breakdown, progression timeline, emotional signals. |
| `tone` | `Tone` | **v2 new** — register (formality / energy / pace), descriptors, per-party tone. |
| `tags` | string[] | Short lowercase tags for search/filter. |
| `qualityWarnings` | string[] | Audio / transcript issues flagged by the model. |

### v2 nested types

#### `SummaryBullet`

A blog-post section inside `executiveSummaryBullets` (**v3**). Aim for 3–6 of these covering the whole call.

| Field | Type | Notes |
|---|---|---|
| `header` | string | Short section heading, e.g. `"Pricing Discussion"`. |
| `startTimestamp` | string | Call timestamp where this section begins — `"MM:SS"`, or `"HH:MM:SS"` for calls over an hour. |
| `paragraphs` | string[] | One or more complete, self-contained prose paragraphs covering everything material in that phase. |

> **Pre-v3 shape.** Artifacts with `schemaVersion` 1 or 2 use the older flat-bullet shape instead: `{ text, category, importance, sourceSegmentIds }`, where `category` is one of `context \| outcome \| next_steps \| concern \| agreement \| decision \| blocker \| observation \| topic`. Both shapes can appear under the same JSON key depending on when the call was analyzed — check `schemaVersion` before assuming which one you have.

#### `NextStep`

An entry inside `nextSteps` (**v3**) — a planned, forward-looking activity a speaker said they'd do, distinct from a launchable [`ActionItem`](#actionitem).

| Field | Type | Notes |
|---|---|---|
| `text` | string | The planned activity, e.g. `"Prepare the presentation deck for tomorrow's review"`. |
| `ownerSpeaker` | string | Legacy-style label (e.g. `"Speaker 1"`) or null. |
| `when` | string | Free-form timing the model could extract (e.g. `"tomorrow"`, `"next week"`), or null. |
| `sourceSegmentIds` | string[] | Segment ids backing the item. |

#### `DiscussionPoint`

A point on the chronological discussion timeline inside `keyDiscussionPoints`.

| Field | Type | Notes |
|---|---|---|
| `text` | string | What was discussed at this point. |
| `topic` | string | Free-form topic label, e.g. `Pricing`, `Delivery timeline`. |
| `phase` | string | `opening \| middle \| closing \| followup` |
| `speakerId` | string | Stable transcript id (e.g. `spk_1`) when one speaker drove this point; null for joint discussion. |
| `speakerLabel` | string | Display label (`Speaker 1` or refined name). |
| `speakerDisplayName` | string | Refined display name when known. |
| `speakerRole` | string | `USER \| CONTACT \| UNKNOWN` |
| `importance` | string | `low \| medium \| high` |
| `sourceSegmentIds` | string[] | Segment ids backing this point. |

#### `Sentiment` (v2)

Polarity and how it evolved through the call.

| Field | Type | Notes |
|---|---|---|
| `overall` | string | `positive \| neutral \| negative \| mixed \| unclear` |
| `score` | number | `[-1.0, 1.0]`. Null when truly unclear. |
| `reason` | string | Short rationale. |
| `userSentiment` | `SpeakerSentiment` | Phone owner's polarity read. |
| `contactSentiment` | `SpeakerSentiment` | Other party's polarity read. May disagree with `userSentiment`. |
| `progression` | `SentimentMoment[]` | 2–4 points along the call capturing shifts. |
| `emotionalSignals` | string[] | 0–6 short adjective tags, grounded in the transcript (e.g. `frustrated`, `appreciative`, `relieved`). |

`SpeakerSentiment`: `{ overall, score, notes }`.

`SentimentMoment`: `{ phase, overall, note, sourceSegmentIds }` where `phase ∈ {opening, middle, closing, followup}`.

#### `Tone` (v2)

The **register** of the conversation — *how* it was said. Distinct from sentiment, which is polarity.

| Field | Type | Notes |
|---|---|---|
| `overall` | string | Headline label, e.g. `professional`, `friendly`, `tense`, `urgent`, `supportive`, `transactional`, `escalated`, `empathetic`, `terse`, `playful`, `confrontational`, `informational`, `casual`, `formal-business`, `conversational`. |
| `descriptors` | string[] | 1–4 short adjectives. |
| `formality` | string | `formal \| semi-formal \| informal` |
| `energy` | string | `low \| medium \| high` |
| `pace` | string | `slow \| normal \| fast` |
| `notes` | string | 1–2 sentence rationale. |
| `byParty.userTone` | `PartyTone` | Tone read for the phone owner. |
| `byParty.contactTone` | `PartyTone` | Tone read for the other party. They commonly differ. |

`PartyTone`: `{ overall, descriptors, notes }`.

#### `ActionItem`

A task extracted from the call. Also persisted to Postgres for editable state — see [Action items](action-items.md).

| Field | Type | Notes |
|---|---|---|
| `title` | string | Short action title. |
| `description` | string | Longer context. |
| `ownerSpeaker` | string | Legacy alias for `ownerSpeakerLabel`. |
| `ownerSpeakerId` | string | Stable `spk_N` from the normalised transcript. |
| `ownerSpeakerLabel` | string | Display label at extraction time. |
| `ownerDisplayName` | string | Refined name when known. |
| `ownerRole` | string | `USER \| CONTACT \| UNKNOWN` |
| `dueDate` | string | `YYYY-MM-DD` or null. |
| `priority` | string | `low \| medium \| high` |
| `sourceSegmentIds` | string[] | Segment ids cited as evidence. |
| `intent` | string | Provider-neutral classification: `meeting \| email \| call \| message \| reminder \| task \| none` |
| `intentMetadata` | `ActionIntentMetadata` | Typed payload for deep-link construction. See [Action items · Intent classification](action-items.md#intent-classification). |

#### `ActionIntentMetadata`

Optional metadata the LLM extracts to help a client launch the right external app. Every field is nullable — the model is instructed never to invent values.

| Field | Type | Notes |
|---|---|---|
| `providerHint` | string | When explicit: `meet \| zoom \| teams \| phone` (meetings) or `whatsapp \| sms \| telegram` (messages). A hint, not a decision. |
| `attendees` | `{name, email?}[]` | Meeting attendees. Email must appear in the transcript. |
| `proposedAt` | string | ISO-8601 datetime for a meeting. |
| `durationMinutes` | int | Meeting length when mentioned. |
| `title` | string | Event / reminder title override. |
| `location` | string | Physical location when explicit. |
| `toEmail` | string | Email recipient — must appear in the transcript. |
| `toName` | string | Recipient display name. |
| `subject` | string | Suggested email subject (composed draft). |
| `bodyPreview` | string | 1–2 sentence draft body (composed). |
| `phoneNumber` | string | Only when a different number than the current call was named. |
| `contactName` | string | Who to call / message. |
| `channel` | string | `whatsapp \| sms \| telegram` when explicit. |
| `handle` | string | Chat handle when mentioned. |
| `remindAt` | string | ISO-8601 datetime for a reminder. |
| `notes` | string | Short notes for task / reminder intents. |

### Legacy aliases

The endpoint always emits these alongside the v2 shape so older mobile builds keep working:

| Legacy field | Source |
|---|---|
| `shortSummary` | `oneLineSummary` |
| `detailedSummary` | `executiveSummary` |
| `keyPoints` | `text` of all section items with `importance == "high"`, in section + item order |

`actionItems` and `tags` have the same field names in both shapes — they pass through unchanged. Aliases are added **only when the new fields are present**. If a stored artifact is already in a legacy shape (rare; only for pre-refactor rows), it's returned untouched.

### Errors

| Status | Cause |
|---|---|
| 404 | Call missing or owned by another user, or no analysis artifact exists yet. |

### Notes

- For editable, server-side action item state (mark done) use [`PATCH /api/actions/{id}`](action-items.md). The `actionItems` inside this JSON are a **point-in-time snapshot** from the LLM.
- The `sourceSegmentIds` arrays reference [normalised transcript](transcripts.md) segment ids. If the model has no evidence to cite for a claim, the array is empty rather than invented.
- Sentiment and tone are produced by the LLM with explicit guard-rails — when speakers are brief or terse, the model is asked to prefer `unclear` and lower-magnitude scores rather than over-claim.

# Analysis

## GET `/api/calls/{id}/analysis`

Returns the structured business analysis for a completed call.

### Response — `200 OK`

```json
{
  "schemaVersion": 1,
  "callId": "f0a1d2e3-...",
  "category": "sales",
  "title": "Pricing discussion",
  "oneLineSummary": "Customer asked for revised pricing by Friday.",
  "executiveSummary": "The customer discussed the proposal and committed to a revised pricing sheet by EOD Friday.",
  "outcome": "Revised pricing agreed",
  "sections": [
    {
      "id": "sec_001",
      "title": "Pricing Objection",
      "kind": "objection",
      "summary": null,
      "items": [
        {
          "text": "Quote needs to be revised",
          "priority": "high",
          "speaker": "Ravi",
          "sourceSegmentIds": ["seg_0002"]
        }
      ]
    }
  ],
  "actionItems": [
    {
      "title": "Send revised pricing",
      "description": "Revised pricing sheet by Friday",
      "ownerSpeaker": "Praveen",
      "dueDate": "2026-06-26",
      "priority": "high",
      "sourceSegmentIds": ["seg_0002"],
      "ownerSpeakerId": "spk_1",
      "ownerSpeakerLabel": "Praveen",
      "ownerDisplayName": "Praveen",
      "ownerRole": "USER"
    }
  ],
  "questions": [],
  "decisions": [],
  "risks": [],
  "objections": [],
  "followUps": [],
  "sentiment": null,
  "topics": ["sales", "pricing"],
  "keyPoints": [
    "Pricing under review",
    "Send revised quote by Friday"
  ],
  "shortSummary": "Customer asked for revised pricing by Friday.",
  "detailedSummary": "The customer discussed the proposal and committed to a revised pricing sheet by EOD Friday."
}
```

### Field reference

| Field | Meaning |
|---|---|
| `category` | Best-guess call category. Free-form string. |
| `title` | Headline. |
| `oneLineSummary` | A single sentence. Mirrored as `shortSummary` for legacy clients. |
| `executiveSummary` | A short paragraph. Mirrored as `detailedSummary`. |
| `outcome` | What was decided / resolved. |
| `sections[]` | Open-ended, model-defined groupings. Use `kind` to switch on UI. |
| `actionItems[]` | Action items in the same shape as the `/api/actions` endpoint. |
| `keyPoints[]` | Short bullets suitable for a card UI. |
| `topics[]` | Free-form labels. |
| `sentiment` | Optional sentiment string when the model emits one. |

### Errors

| Status | code | Cause |
|---|---|---|
| 404 | `call_not_found` | Call missing or owned by another user. |
| 422 | `call_not_completed` | Status is not `COMPLETED`. |

### Notes

- The shape is **open**. The LLM may emit additional sections / arrays without breaking older clients — known top-level keys are pinned in JSON-schema; everything else passes through.
- Legacy aliases (`shortSummary`, `detailedSummary`) are populated on every response so old mobile builds keep working.
- For machine-readable action items prefer the [`/api/actions` endpoint](action-items.md), which persists them as first-class objects.

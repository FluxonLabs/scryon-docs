# Sharing & summary digest

| | |
|---|---|
| **Status** | `spec` — client-built, no backend work required |
| **Owner** | Android |
| **Depends on** | [LLM analysis](analysis.md) (`GET /api/calls/{id}/analysis`), [Calls API](../api/calls.md) (`GET /api/calls/{id}`) |

## What it does

Turns a completed call's analysis into a clean, **shareable text digest** — the Scryon equivalent of a Fathom / Otter "meeting summary" — that the user can send over WhatsApp, email, or any share target straight from the call detail screen.

The reference layout we're matching:

```
📞 Pricing discussion with Alex
6 Jun 2026 · 38 min · with Alex

SUMMARY
Customer asked for revised pricing by Friday and agreed to a follow-up demo.

KEY POINTS
• Pricing tier is the only remaining blocker
• Customer wants the 12-month discount reflected
• Demo locked for Friday 11am

ACTION ITEMS
☐ Send revised pricing sheet — You · by 26 Jun
☐ Schedule follow-up call — Alex

DECISIONS
• Demo will use the new pricing dashboard build

Shared via Scryon
```

## Why it's client-built (not backend)

We already return **everything** the digest needs in the analysis JSON and the call record. There is **no new LLM call, no new field, and no new endpoint**. The digest is a pure, deterministic *transform* of data the client already holds, so it lives in the client:

- **Zero round-trips** — share works offline once analysis is cached.
- **Localisable** — date formats, section headers, and the `Shared via Scryon` footer follow the device locale.
- **No backend coupling** — the share sheet (WhatsApp / Gmail / SMS) is an OS concern, same seam we drew for [action-item intent chips](../api/action-items.md#intent-classification): the backend classifies, the client launches.

> If a second platform (iOS, web) ever needs byte-identical output, promote this spec to a backend `shareDigest` block in the analysis JSON. Until then, this doc **is** the contract — keep platforms in sync by following it.

## Inputs

| Digest piece | Source | Field |
|---|---|---|
| Title | `GET /api/calls/{id}` | `title` → fallback `analysis.suggestedTitle` |
| Date | `GET /api/calls/{id}` | `recordedAt` → fallback `createdAt` |
| Duration | `GET /api/calls/{id}` | `durationSeconds` |
| Counterparty | `GET /api/calls/{id}` | `contactName` (omit the `with …` clause if null) |
| `SUMMARY` line | analysis | `oneLineSummary` → fallback first sentence of `executiveSummary` |
| `KEY POINTS` | analysis | `executiveSummaryBullets[].text` (cap 5) → fallback top `keyDiscussionPoints[].text` |
| `ACTION ITEMS` | analysis | `actionItems[]` → `title`, `ownerDisplayName`, `dueDate`, `intent` |
| `DECISIONS` | analysis | `decisions[]` |
| `FOLLOW-UPS` *(expanded only)* | analysis | `followUps[]` |
| `TOPICS` *(expanded only)* | analysis | `sections[]` → `items[].text` |

## Composition rules

1. **Section order is fixed:** header → `SUMMARY` → `KEY POINTS` → `ACTION ITEMS` → `DECISIONS` → footer. Expanded mode inserts `TOPICS` after `KEY POINTS` and `FOLLOW-UPS` after `ACTION ITEMS`.
2. **Drop empty sections entirely** — no "Decisions: none" lines. If only the header and footer survive, fall back to sharing `oneLineSummary` alone.
3. **Action items group by owner** (`ownerDisplayName`); null-owner items go under an `Unassigned` group, listed last. Render the phone user's own name as **You**.
4. **Due dates**: append `· by {dueDate}` only when `dueDate` is present. `dueDate` is a raw LLM string — render verbatim, do not attempt to re-parse.
5. **Length cap** (compact mode): ≤ 5 key points, ≤ 8 action items, ≤ 4 decisions, each line truncated to ~120 chars with `…`. Keeps the message under a single WhatsApp screen.
6. **Never invent.** Only render fields the analysis actually returned. Old v1 calls have no `executiveSummaryBullets` — fall back to `keyDiscussionPoints`, then to `executiveSummary`.
7. **Intent glyph** *(optional polish)*: prefix an action item with its intent emoji instead of `☐` when `intent` is set — `meeting 📅`, `email ✉️`, `call 📞`, `message 💬`, `reminder ⏰`, `task ✅`, `none`/unset → `☐`.

## Two render targets

The body is identical; only the markup differs.

### WhatsApp / generic `text/plain`

WhatsApp honours `*bold*`. Make headers bold; everything else stays plain:

```
*📞 Pricing discussion with Alex*
6 Jun 2026 · 38 min · with Alex

*SUMMARY*
Customer asked for revised pricing by Friday and agreed to a follow-up demo.

*KEY POINTS*
• Pricing tier is the only remaining blocker
• Customer wants the 12-month discount reflected

*ACTION ITEMS*
☐ Send revised pricing sheet — You · by 26 Jun
☐ Schedule follow-up call — Alex

_Shared via Scryon_
```

### Email

- **Subject:** `{title} — call summary` (e.g. `Pricing discussion with Alex — call summary`).
- **Body:** the same digest **without** WhatsApp asterisks (plain text), or an HTML version mirroring the structure if the share target accepts `text/html`.

## Share mechanism (Android, follow-up implementation)

No backend involvement — the digest string is dropped into a standard share intent:

```kotlin
// System share sheet — WhatsApp, Gmail, SMS, etc. appear automatically
val send = Intent(Intent.ACTION_SEND).apply {
    type = "text/plain"
    putExtra(Intent.EXTRA_SUBJECT, "$title — call summary")
    putExtra(Intent.EXTRA_TEXT, digestPlain)   // or digestWhatsApp
}
startActivity(Intent.createChooser(send, "Share summary"))
```

Direct targets, if the UI offers explicit WhatsApp / email buttons:

```kotlin
// WhatsApp
Uri.parse("https://wa.me/?text=" + Uri.encode(digestWhatsApp))
// Email
Uri.parse("mailto:?subject=" + Uri.encode(subject) + "&body=" + Uri.encode(digestPlain))
```

## What this is NOT

- ❌ Not a new API or LLM call — it reuses `GET /api/calls/{id}/analysis`.
- ❌ Not a backend responsibility (today) — the server never builds share text or knows the user's installed apps.
- ❌ Not the full transcript — it's the *summary*. Sharing raw transcripts is a separate feature with its own privacy review.

## Related

- [LLM analysis](analysis.md) — the schema every field comes from.
- [API · Analysis](../api/analysis.md) — exact field reference.
- [API · Action items](../api/action-items.md#intent-classification) — intent vocabulary reused for the action-item glyphs.
- [Calls API](../api/calls.md) — title / date / duration / contact.

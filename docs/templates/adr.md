# ADR-\{NNN\}: \{Decision title\}

> Template — copy this page into `architecture/adrs/{NNN}-slug.md` when recording an architectural decision. Delete this callout when you're done.

| | |
|---|---|
| **Status** | proposed / accepted / superseded by ADR-### / deprecated |
| **Date** | YYYY-MM-DD |
| **Deciders** | @owner @reviewer1 @reviewer2 |

## Context

What's the problem we're trying to solve? Why is the status quo not good enough? What constraints does the system place on us?

Examples:

- "Our diarization pipeline mis-attributes speakers on 12% of multi-party calls. We need a better answer than 'try harder'."
- "Postgres `SELECT FOR UPDATE SKIP LOCKED` is becoming a hotspot at 1000 calls/day."

## Decision

A short, declarative statement of what we decided.

> We will use pyannoteAI for diarization, with Lemonfox built-in diarization as a graceful fallback.

## Alternatives considered

For each option, explain what it is and why it lost.

### Option A — \{Name\}

- **Pros:** ...
- **Cons:** ...
- **Verdict:** rejected because ...

### Option B — \{Name\}

- **Pros:** ...
- **Cons:** ...
- **Verdict:** rejected because ...

### Option C — \{Name\} _(chosen)_

- **Pros:** ...
- **Cons:** ...
- **Verdict:** accepted.

## Consequences

What does choosing this option imply?

- **Positive:** New capability X. Better Y.
- **Negative:** Adds a dependency on Z. Increases per-call cost by $A.
- **Neutral:** We need a fallback path for when pyannote is unreachable.

## Implementation notes

- Migration steps.
- Feature flag for safe rollout.
- Rollback strategy.

## Links

- Related PR(s)
- Related issue(s)
- Related docs ([Diarization](../features/diarization.md), etc.)

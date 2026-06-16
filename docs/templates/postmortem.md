# Post-mortem: \{Incident title\}

> Template — copy this page into `operations/postmortems/YYYY-MM-DD-slug.md` after a customer-impacting incident. Delete this callout when you're done.

| | |
|---|---|
| **Date** | YYYY-MM-DD |
| **Severity** | sev-1 / sev-2 / sev-3 |
| **Owner** | @incident-commander |
| **Status** | draft / final |

## TL;DR

A 2-3 sentence executive summary. What broke, who was affected, how it was fixed, what we'll do about it.

## Impact

- **Users affected:** number / percentage.
- **Calls affected:** number, by status.
- **Duration:** start → end (UTC).
- **What worked / didn't work for users.**
- **Money impact (if any):** lost revenue, refunds, provider costs.

## Timeline

All times UTC. Be ruthless about including the times of detection, escalation, mitigation, and verification.

| Time | Event |
|---|---|
| 14:02 | Sentry alert fires: `OpenAiTimeoutException` spike. |
| 14:04 | On-call ack. |
| 14:08 | Identified that OpenAI was returning 503s. |
| 14:12 | Decided to fail-fast and surface "analysis temporarily unavailable" to clients. |
| 14:20 | OpenAI returns to baseline. |
| 14:25 | Backlog of failed calls re-queued. |

## What went well

- ...
- ...

## What went poorly

- ...
- ...

## Where we got lucky

- ...

## Root cause

The mechanical cause and the contributing factors. **Avoid blame.** Look for systemic issues.

> The pipeline didn't degrade gracefully when OpenAI returned 503s; we retried tightly and exhausted our worker pool, which made existing transcript reads slow.

## Action items

| Action | Owner | Priority | Due |
|---|---|---|---|
| Add exponential backoff with cap to `OpenAiAnalysisClient` | @owner | high | YYYY-MM-DD |
| Cap worker thread pool size; add metric | @owner | medium | YYYY-MM-DD |
| Update [analysis](../features/analysis.md) doc with retry behaviour | @owner | low | YYYY-MM-DD |

## Lessons learned

A short, opinionated takeaway worth remembering on future on-call shifts.

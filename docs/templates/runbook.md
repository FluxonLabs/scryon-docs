# Runbook: \{Operation\}

> Template — copy this page into `operations/runbook.md` (or its own file under `operations/runbooks/`) when documenting a new operational task. Delete this callout when you're done.

| | |
|---|---|
| **Owner** | @your-github-handle |
| **Pager** | yes / no |
| **Severity** | sev-1 / sev-2 / sev-3 |
| **Estimated time** | 5 min / 30 min / 2 hours |

## When to run this

Describe the symptom or alert that triggers this runbook. Be specific — pager noise is the enemy.

- Symptom: "API returns 5xx on `/api/calls/analyze` for > 5 minutes."
- Or: "Alert `pipeline-failure-rate-high` fires."

## Pre-flight

Things to confirm before taking action:

- [ ] You have access to the prod database.
- [ ] You have admin tokens for the affected user (if relevant).
- [ ] You're on a stable network.

## Diagnose

The goal is to **confirm** the cause before mitigating, so we don't fight ghosts.

```bash
# Specific log query
... | grep 'event=PIPELINE status=FAILED'

# Specific Prometheus query
rate(scryon_calls_failed_total[5m])

# Specific DB query
SELECT count(*) FROM call_records WHERE status='FAILED' AND updated_at > now() - interval '1 hour';
```

## Mitigate

Step-by-step. Concrete commands. No "see the docs".

1. ...
2. ...

```bash
# Concrete command
```

## Verify

How to confirm the fix worked.

```bash
# Concrete check
```

## After-action

- [ ] Open a post-mortem if this is a customer-impacting incident. Use [templates/postmortem.md](postmortem.md).
- [ ] File a follow-up issue to make this not happen again.
- [ ] Update this runbook with anything you learned.

## Related

- Code: `XxxService.java`
- Docs: `[...](../features/xxx.md)` — link to the relevant feature doc.
- Related runbooks: [...](runbook.md)

# Feature: {Feature Name}

> Template — copy this page into the appropriate section (usually `features/`) when documenting a new capability. Delete this callout when you're done.

| | |
|---|---|
| **Status** | `experimental` / `beta` / `stable` |
| **Owner** | @your-github-handle |
| **Feature flag** | `SCRYON_..._ENABLED` (or "none") |
| **Introduced in** | PR #N |
| **Depends on** | List other features / external providers. |

## What it does

A 1-3 sentence summary. What does this feature *do for the user*?

## Why it exists

The problem it solves and the alternatives we considered. Cite the issue / discussion that motivated it.

## How it works

Step-by-step or a small diagram.

```
┌──────┐    ┌──────┐
│  A   │──▶│  B   │ ─...
└──────┘    └──────┘
```

### Components

| Component | File | Purpose |
|---|---|---|
| `XxxService` | `com/scryon/.../XxxService.java` | What it does. |

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `SCRYON_..._ENABLED` | `false` | Master switch. |
| `SCRYON_..._FOO` | — | What it tunes. |

## Privacy

Anything stored, sent to providers, or exposed via APIs that touches user content. Link to the [Privacy & security](../privacy-and-security.md) page.

## Failure modes

| Failure | Behaviour |
|---|---|
| Provider down | Soft fail / hard fail / fall back. |
| Bad input | 400 / 422 / silent skip. |

## Telemetry

Metrics, logs, and traces this feature emits.

- `scryon.xxx.duration` (timer)
- `event=XXX_STARTED callId=... ...`
- Span: `pipeline.xxx`

## Code map

| File | What |
|---|---|
| `XxxService.java` | Core logic. |
| `XxxController.java` | REST surface (if any). |
| `XxxClient.java` | External provider integration. |
| `XxxTest.java` | Tests. |

## What this feature is NOT

Set expectations explicitly. Useful for keeping scope creep out of follow-ups.

- ❌ Not a replacement for X.
- ❌ Not intended for Y.

## Related

- [Other feature](other-feature.md)
- [Relevant ADR](../templates/adr.md)

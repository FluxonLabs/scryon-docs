# Contributing

Welcome — thanks for wanting to ship code to Scryon. This page is the short version. Detailed conventions are in [Coding conventions](coding-conventions.md).

## Workflow

1. **Open an issue first** for anything bigger than a bugfix. A short discussion saves a long PR.
2. **Branch from `main`.** Use a descriptive branch name (`feat/voice-profile-stats`, `fix/pyannote-403`, `chore/bump-spring`).
3. **Make small PRs.** Reviewers can stay focused on one change; risk goes down; revert is easy.
4. **Always include tests.** New behaviour without a test is unfinished work.
5. **Run `./mvnw test` before pushing.** CI runs the same.
6. **Open a PR against `main`.** Fill in the PR description fully — what changed, why, how it was verified.
7. **Merge after one approval** if CI is green.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(voice): add voice-profile DELETE endpoint
fix(diarization): force Content-Type on presigned PUT
chore: bump spring-boot to 3.3.5
docs(architecture): add data model diagram
test(speakers): cover positional fallback path
```

The commit body should explain **why**, not just **what**. The diff already shows the what.

## PR description template

```markdown
## Summary
- 1-3 bullet points on what changed and why.

## Test plan
- [ ] mvn test green.
- [ ] Manual verification (specify steps if applicable).

## Risk
- Anything to watch for during rollout.
```

## Privacy review

Any change that touches user audio, transcripts, names, or phone numbers needs an explicit privacy note in the PR. See [Privacy & security](../privacy-and-security.md) for the hard rules.

## Releasing

We continuously deploy `main` to production via Railway. There's no release ceremony — every merged PR is in production within ~3 minutes of the push.

If a PR is *not* safe to ship immediately, label it `do-not-deploy` and merge later.

## Code review checklist

Reviewers, please confirm:

- [ ] Tests cover the change.
- [ ] No private data appears in logs / metrics / Sentry.
- [ ] Public API shapes are still backward-compatible (additive only).
- [ ] Migrations are forward-only and idempotent.
- [ ] No new TODOs without an owner / issue link.
- [ ] Documentation updated in `scryon-docs` if behaviour changed.

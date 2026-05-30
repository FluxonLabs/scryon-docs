# GitBook setup

This doc tree is designed to be published to **docs.scryon.app** via GitBook Git Sync. Once set up, every push to `main` updates the live site automatically.

## 1. Connect this repo to GitBook

1. Sign in to [GitBook](https://app.gitbook.com).
2. Create a **space** for Scryon. Pick "Public" for a public docs site, or "Private" if you want to gate it.
3. Open the space → **Synchronize with Git** (left sidebar) → **GitHub**.
4. Authorise the GitBook GitHub app for the **FluxonLabs** organisation, scope to the **scryon-docs** repo.
5. Pick:
   - **Repository:** `FluxonLabs/scryon-docs`
   - **Branch:** `main`
   - **Project directory:** `/` (root)
   - **Bi-directional sync:** **off** (recommended — keep Git as the source of truth).
6. Click **Save & Sync**. GitBook will read `SUMMARY.md` and build the table of contents.

## 2. Custom domain — docs.scryon.app

GitBook handles HTTPS automatically; you just point DNS.

1. In GitBook: space settings → **Domain** → **Custom domain**.
2. Enter `docs.scryon.app`.
3. GitBook gives you a CNAME target like `hosting.gitbook.io`.
4. In your DNS provider (Cloudflare, Route 53, etc.):
   ```
   Type    Name    Target                  TTL
   CNAME   docs    hosting.gitbook.io.     auto
   ```
   - On Cloudflare, set the orange-cloud (proxy) **off** initially. GitBook handles TLS via its own ACME flow.
5. Wait for GitBook's domain check to turn green (usually < 5 min).
6. Visit `https://docs.scryon.app` — done.

> If you're using Cloudflare and want the proxy on, set **SSL/TLS mode = Full (strict)** and add a Page Rule to bypass aggressive caching for `docs.scryon.app/*`. GitBook tracks this in their own docs; check their site for the latest.

## 3. Configuring `.gitbook.yaml`

The root `.gitbook.yaml` file in this repo points GitBook at the right structure:

```yaml
root: ./
structure:
  readme: README.md
  summary: SUMMARY.md
```

Edit this file if you ever move the docs into a sub-directory.

## 4. How content updates flow

```
Edit Markdown locally
        │
        ▼
git commit + push (PR → main)
        │
        ▼
GitBook Git Sync watches FluxonLabs/scryon-docs:main
        │
        ▼
GitBook rebuilds the published site (≈ 30 seconds)
        │
        ▼
https://docs.scryon.app
```

There is no manual publish step — merging to `main` is the publish.

## 5. Adding a new page

1. Add the file under the right folder (`features/`, `api/`, etc.).
2. Add a line to `SUMMARY.md` so GitBook picks it up.
3. PR → merge to `main`.

> If you add a page but forget to update `SUMMARY.md`, GitBook will still publish it as a hidden orphan. Always update the TOC.

## 6. Adding a new top-level section

1. Create the folder.
2. Add a `## Section name` heading + bullet list to `SUMMARY.md` (see the existing sections for the format).
3. Open a PR.

## 7. Templates

The [`templates/`](templates/feature.md) folder contains drop-in templates for:

- New features → [feature.md](templates/feature.md)
- New API endpoints → [api-endpoint.md](templates/api-endpoint.md)
- Operational runbooks → [runbook.md](templates/runbook.md)
- Architecture decisions → [adr.md](templates/adr.md)
- Post-mortems → [postmortem.md](templates/postmortem.md)

Copy the file, rename it, and fill in the blanks. Delete the "> Template — …" callout at the top when you're done.

## 8. Local preview

GitBook doesn't ship a CLI preview today. The fastest local rendering is to open the `.md` files in VS Code or any Markdown previewer. The diagrams use code-fenced ASCII art, which renders cleanly in both GitBook and plain Markdown viewers.

## 9. Reverting a publish

GitBook publishes on every commit to `main`. To roll back:

```bash
git revert <commit>
git push origin main
```

GitBook will pick up the revert and republish within a minute. There is no "rollback" button in the GitBook UI for Git-synced spaces — Git is the source of truth.

## 10. Image assets

For diagrams and screenshots, put them under `assets/` and reference relatively:

```markdown
![Diagram](../assets/diagrams/pipeline.png)
```

Prefer ASCII art and Mermaid for diagrams; both render in GitBook without an upload.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| GitBook shows "out of sync" | Git Sync token expired. | Re-authorise the GitHub app from GitBook settings. |
| Page exists but doesn't appear in nav | Not in `SUMMARY.md`. | Add it. |
| Custom domain shows GitBook's domain | DNS hasn't propagated. | Wait, or `dig docs.scryon.app` to verify the CNAME resolves. |
| TLS warning on custom domain | ACME flow didn't complete. | In GitBook, click "Re-verify" on the domain. |

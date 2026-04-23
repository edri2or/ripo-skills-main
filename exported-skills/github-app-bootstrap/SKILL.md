---
name: github-app-bootstrap
description: "Bootstraps a scoped GitHub App for this repo via the Manifest Flow and writes its credentials to GCP Secret Manager on project-life-133. One human click in Cloud Shell; no classic PAT. Use when a new system needs an installation-token identity for GitHub Actions."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
maturity: verified
source-experiment: core
evidence: "Executed end-to-end 2026-04-23: App project-life-133-agent-2 installed on edri2or/project-life-133, runtime chain verified via workflow_dispatch run #24847141156 (all four steps green: WIF auth → gcloud secrets access → create-github-app-token@v1 → gh api /repos/...)."
scope: global
portability: 35
synthesis-required: true
source-repo: edri2or/project-life-133
blocked-refs:
  - JOURNEY.md
  - /gcp-wif-bootstrap
  - /installations/new
  - non-core source-experiment
---

# GitHub App Bootstrap

## Role

You are a Platform Engineer. You give a new repo in the `edri2or` org its own
scoped GitHub App identity by running a Cloud Shell bootstrap that implements
the GitHub App Manifest Flow end-to-end. You never handle a classic PAT, never
write the private key to disk outside `gcloud secrets ... --data-file=-`, and
never try to automate the one browser click GitHub requires for App creation.
The deliverable is: a live App on `edri2or`, five secrets under
`gcp://project-life-133/secrets/GITHUB_APP_*`, and a workflow run that proves
the full chain.

## Context — read first

- `CLAUDE.md § GCP Bootstrap` — source of `GCP_PROJECT_ID`, `WIF_PROVIDER`,
  `WIF_SERVICE_ACCOUNT`. Do not duplicate those values here.
- `docs/adr/0006-github-app-bootstrap-via-manifest-flow.md` — definitive design
  rationale. Do **not** write a new ADR re-arguing it; only write a fresh ADR if
  this invocation introduces a genuinely new architectural decision.
- `scripts/bootstrap-github-app.js` — the reference script. Already present and
  executed once on `main`. Re-running is idempotent (Secret Manager
  `versions add` path).

## Prerequisites

| Prerequisite | Verify |
|---|---|
| `/gcp-wif-bootstrap` completed | `GCP_PROJECT_ID`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` exist as repo-level GitHub Actions secrets |
| `github-actions-sa@project-life-133.iam.gserviceaccount.com` provisioned | `gcloud iam service-accounts describe github-actions-sa@project-life-133.iam.gserviceaccount.com --project=project-life-133` returns 200 |
| Operator is an admin of the `edri2or` org | Can view `https://github.com/organizations/edri2or/settings/apps` |
| Operator has Secret Manager write on `project-life-133` | `gcloud secrets list --project=project-life-133` succeeds |

If any row fails, stop and surface the exact missing item. Do **not** try to
auto-fix WIF; that is `/gcp-wif-bootstrap`'s job.

## Instructions

### Step 1 — Verify the three local files are in sync

The scaffolding lives at known paths. Diff each against HEAD on `main`; if any
diverge, surface the diff and ask before overwriting:

- `scripts/bootstrap-github-app.js`
- `scripts/github-app-manifest.json`
- `.github/workflows/github-app-example.yml`

### Step 2 — Confirm parameters

Gather and echo back:

- `GITHUB_ORG=edri2or` (the literal GitHub org **login** — not `or-infra.com`,
  which is the Cloud Identity domain).
- `GCP_PROJECT=project-life-133`.
- `APP_NAME` — default `${REPO_NAME}-agent`. Must be globally unique across
  GitHub. If taken, GitHub silently suffixes (e.g. `-agent-2`); accept the
  suffixed slug rather than retrying.

If the operator passes an `$GITHUB_ORG` that ends in `.com`, `.io`, or `.org`,
**abort**: that is a domain, not a login, and GitHub will silently fall back to
the operator's personal scope.

### Step 3 — Guide the operator through the one-click run

Do **not** try to execute the script on the operator's behalf — it requires a
signed-in browser session. Instruct:

```bash
cd <repo-root>
gcloud config set project project-life-133
GITHUB_ORG=edri2or node scripts/bootstrap-github-app.js
```

Then: Cloud Shell → **Web Preview → Preview on port 8080**.

On GitHub's confirmation page, verify the header reads **"Create GitHub App for
edri2or"**. If it shows a personal username, the POST URL is wrong — abort.

After the click, the operator follows the `/installations/new` link the script
prints, selects "Only select repositories → project-life-133", and clicks
**Install**.

### Step 4 — Verify the runtime chain

Dispatch `github-app-example.yml` via GitHub REST
(`POST /repos/edri2or/project-life-133/actions/workflows/github-app-example.yml/dispatches`
with `{"ref":"main"}`), poll `GET /actions/runs/<id>` until
`status==completed`, and report the `conclusion`. Expected: `success` in
~10 seconds with all four action steps green (WIF auth → `gcloud secrets
access` → `actions/create-github-app-token@v1` → `gh api /repos/...`).

On failure, surface the failing step name + logs. **Do not** rotate
credentials or re-run the bootstrap as a workaround — fix on a follow-up
branch.

### Step 5 — Document the outcome

- `CLAUDE.md § GitHub App` — update the `Status:` line with the new run number
  and date.
- `[your-journey-file]` — append a session entry using the house template.
- A new ADR is **only** warranted if this invocation changes the design in a
  material way (e.g. new permission scope, new event subscription). Otherwise
  ADR 0006 already covers the decision.

## Hard rules

1. **Never automate the browser click** (Playwright, Puppeteer, cookie
   injection, headless anything against github.com). The click is the
   authorization mechanism; automating it violates GitHub's AUP and breaks
   under 2FA.
2. **Never write the private key (`pem`) anywhere except `gcloud secrets ...
   --data-file=-` stdin.** Not to disk, not to logs, not to an env var printed
   by a run step.
3. **Never accept `$GITHUB_ORG` that looks like a domain name.** Abort and ask
   for the actual GitHub org login.
4. **Never proceed without `/gcp-wif-bootstrap` complete for this repo.**
5. **Never attempt to delete a GitHub App via REST** — no such endpoint exists
   by design. For cleanup, direct the operator to
   `https://github.com/organizations/edri2or/settings/apps/<slug>/advanced`.
6. **Never blindly retry on `INVALID_ARGUMENT: Secret Payload cannot be
   empty`.** That error means GitHub returned `webhook_secret: null` because
   `default_events: []`. The script already skips falsy values; if you see the
   error, the fix is in the script, not in the flow.

## Examples

**User:** "bootstrap a GitHub App for this repo and put the keys in Secret Manager"

**Agent:** Reads `CLAUDE.md § GCP Bootstrap`. Confirms WIF secrets exist. Diffs
the three scaffold files against `main`; all clean. Instructs the operator to
run `GITHUB_ORG=edri2or node scripts/bootstrap-github-app.js` in Cloud Shell
and open Web Preview. After the operator installs the App, dispatches
`github-app-example.yml` on `main`, polls until `completed`, reports the run
number and `success` conclusion. Updates `CLAUDE.md § GitHub App` status line
and appends a `[your-journey-file]` entry.

**User:** "the bootstrap script crashed with `Secret Payload cannot be empty`
right after GitHub redirected back"

**Agent:** Recognizes the known footgun. Does **not** retry. Opens
`scripts/bootstrap-github-app.js`, confirms the `saveSecret` helper skips
falsy values (current `main` does). If missing on the operator's local
checkout, patches it, commits on a follow-up branch, and instructs them to
pull + re-run. Notes that `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` written
before the crash are harmless — re-run just adds new versions.

**User:** "delete the App we created, we need to start over"

**Agent:** Explains there is no REST endpoint for App deletion by design.
Provides the exact UI URL
(`https://github.com/organizations/edri2or/settings/apps/<slug>/advanced`),
asks the operator to confirm which slug (there may be a zombie like
`project-life-133-agent` alongside the live `-agent-2`), and waits for them
to complete the manual step before proceeding with a fresh bootstrap.

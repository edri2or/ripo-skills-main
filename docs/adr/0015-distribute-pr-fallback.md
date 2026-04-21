# ADR 0015 — PR Fallback in distribute-skills for Branch-Protected Repos

**Date:** 2026-04-21  
**Status:** Accepted

## Context

`distribute-skills.yml` distributes skill files to enrolled repos via a direct GitHub Contents API PUT to `main`. When an enrolled repo has branch protection enabled (with `enforce_admins: true`), the PUT returns HTTP 422. The existing code logged `❌ 422` and continued — the job exited 0, the failure was invisible in GitHub Actions, and the skill never reached the repo.

This was discovered when `optimization-feasibility` was confirmed absent from `project-life-130` after a full distribute run. Manual inspection revealed the workflow had logged a silent 422 and moved on.

## Decision

Add a PR fallback path to the distribute loop in `distribute-skills.yml`:

1. **On 422**: instead of logging and continuing, create a branch named `sync/distribute-{skill}-{YYYYMMDD}` in the enrolled repo using the PAT (`RIPO_SKILLS_MAIN_PAT`).
2. Write the adapted skill file to that branch (not `main`).
3. Open a PR from that branch to the repo's default branch using the PAT — PAT-created PRs trigger `pull_request` workflow events, so enrolled repo checks (e.g. Documentation Enforcement) run normally.
4. Log `⚠️ PR #{n} → {url}` in the step summary — visible, not silent.

Branch name prefix `sync/` is required so the auto-merge workflow in enrolled repos picks it up (per CLAUDE.md Hard Rule #6).

**Hard failure surfacing**: A `hard_failures` counter tracks any error that the PR fallback cannot recover (non-422 PUT failure, ref-fetch failure, branch-write failure, PR-open failure). If `hard_failures > 0` at end of the loop, the script calls `sys.exit(1)`, marking the GitHub Actions job as failed rather than silently green.

## Consequences

- Branch-protected enrolled repos receive skills via PR rather than direct push — no more silent drops
- The distribute job is now visibly red when a non-recoverable error occurs
- Re-runs on the same day reuse the same branch name; if the PR is already open, the PAT POST returns 422 and is logged as `⚠️ PR already open` (not an error)
- Enrolled repos must have their auto-merge workflow configured to handle `sync/` branches for the PR to close automatically; without it, a human must merge the PR

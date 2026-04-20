# ADR 0013 — Self-install via auto-PR instead of direct API write

**Status:** Accepted  
**Supersedes:** ADR 0012  
**Date:** 2026-04-20

## Context

ADR 0012 changed the `self-install` job to use GitHub API `PUT` instead of `git push`,
reasoning that the API bypasses branch protection. This was incorrect: GitHub enforces
required status checks on API writes to protected branches exactly as it does on git pushes.
The API returned `409 — Required status check "Documentation Policy Check" is expected`,
confirmed via workflow run logs (#24688892819).

The root constraint: **any write to main requires the Documentation Policy Check to pass**,
and that check only runs in PR context.

## Decision

The `self-install` job creates a short-lived branch (`auto/self-install-<skill>-<sha[:7]>`),
writes `.claude/commands/<skill>.md` to that branch via GitHub API (no protection on
feature branches), opens a PR to main, and enables auto-merge via `gh pr merge --auto`.

When the Documentation Policy Check passes (it always will — only `.claude/commands/` is
touched, which triggers no policy rule), GitHub auto-merges the PR.

## Consequences

**Positive:**
- Works within branch protection constraints without requiring bypass actor configuration.
- Self-install PRs are visible in the PR history for auditability.
- Documentation Policy Check always passes for commands-only changes.

**Negative:**
- Each skill install creates a transient branch and PR (cleaned up automatically on merge).
- There is a short delay (~1–2 min) between skill landing in `exported-skills/` and it
  appearing in `.claude/commands/` while the PR check runs.
- Auto-merge requires the repo to have auto-merge enabled in settings.

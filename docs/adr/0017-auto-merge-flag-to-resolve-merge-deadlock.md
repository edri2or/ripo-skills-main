# ADR 0017 — Use `--auto` Flag in auto-merge-sync.yml to Resolve Merge Deadlock

**Date:** 2026-04-21
**Status:** Accepted

## Context

The `auto-merge-sync.yml` workflow contains a `merge` job that calls `gh pr merge --squash`
directly. The `merge` job is registered as a required status check in branch protection for
`main`. This creates a circular deadlock:

1. The `merge` job starts running → status is `in_progress`
2. `gh pr merge` attempts to merge the PR
3. GitHub rejects the merge because the required status check `merge` has not yet passed
4. The `merge` job fails
5. The PR can never be auto-merged

This was confirmed for PR #85 (`sync/handoff-2026-04-21`) and affects all future `sync/`
PRs created by `auto-export-skills.yml`.

## Decision

Add the `--auto` flag to `gh pr merge`:

```
gh pr merge <number> --squash --auto --repo <repo> --delete-branch
```

With `--auto`, the job enables auto-merge on the PR and exits successfully. The `merge`
status check then passes. GitHub performs the actual squash-merge automatically once all
required status checks are green.

**Prerequisite:** `Allow auto-merge` must be enabled in repository Settings → General.
This is confirmed enabled on `edri2or/ripo-skills-main`.

## Consequences

- `sync/` PRs from `auto-export-skills.yml` will auto-merge correctly once all checks pass.
- The `merge` job no longer attempts a direct merge while still in-flight.
- No change to external behaviour — the PR is still squash-merged and the branch deleted.

# ADR-0020: Enable Auto-Merge on Distribute Fallback PRs

**Date:** 2026-04-24
**Status:** Accepted

## Context

`distribute-skills.yml` distributes updated skill files to enrolled repositories. When a direct push is blocked by branch protection (HTTP 409/422), it falls back to opening a PR on a `sync/distribute-<skill>-<date>` branch.

All fallback branches are created from the same `main` SHA in a single workflow run. As soon as the first PR is merged, `main` advances by one commit. Every subsequent branch becomes `behind` relative to `main`. Enrolled repos with `strict: true` branch protection (requiring branches to be up-to-date before merge) block all remaining PRs until each branch is manually updated — creating a cascading "behind" conflict loop that requires sequential manual intervention.

## Decision

After opening each fallback PR, immediately call `gh pr merge --auto --squash --repo <target-repo>`. This enables GitHub's native auto-merge queue on the PR, which:

1. Waits for all required status checks to pass.
2. Automatically performs `update-branch` (merge `main` into the PR branch) when the branch falls behind.
3. Merges once the branch is current and all checks have passed.

This eliminates the dependency on the external GitHub App (edri2or-p38-39962) that was previously expected to handle update-branch, and removes the need for manual sequential merging.

## Consequences

- **Positive:** Distribute fallback PRs in enrolled repos with strict branch protection auto-resolve without human intervention.
- **Positive:** Removes coupling to an external GitHub App whose reliability was untested.
- **Neutral:** Requires the `GH_TOKEN` used in `distribute-skills.yml` to have `pull_requests: write` permission on enrolled repos — already satisfied by `RIPO_SKILLS_MAIN_PAT`.
- **Neutral:** Auto-merge will not fire if required checks fail (e.g. Documentation Policy Check) — PRs remain open and visible for human review in that case.

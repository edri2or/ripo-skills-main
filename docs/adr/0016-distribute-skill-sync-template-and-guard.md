# ADR 0016 — Distribute skill-sync.yml Template + Custom-Variant Guard

**Date:** 2026-04-21
**Status:** Accepted

## Context

`distribute-workflow-template.yml` was introduced to push `skill-contribute.yml` to enrolled
repos. It had never been extended to also distribute `skill-sync.yml`.

A full scan of 70 enrolled repos revealed two distinct `skill-sync.yml` variants:

| Variant | Count | Description |
|---------|-------|-------------|
| `send_reusable` | 68 | Calls `skill-sync-reusable.yml@main` via `uses:` + `secrets: inherit` — pushes skills TO ripo-skills-main |
| `receive_pr_github_token` | 1 (`project-life-130`) | Pulls skills FROM ripo-skills-main on a schedule, creates PR with `github.token` |
| `receive_direct_push` | 1 (`project-life-132`) | Pulls skills FROM ripo-skills-main, commits directly to main |

`project-life-130`'s variant was using `GH_TOKEN: ${{ github.token }}` in the
`gh pr create` step. GitHub suppresses `pull_request` events for actions taken with
`GITHUB_TOKEN`, so the Documentation Policy Check never fired on skill-sync PRs —
skills that required a passing check were silently blocked.

Naively distributing `templates/skill-sync.yml` (the `send_reusable` template) to ALL
enrolled repos would overwrite the intentionally different `receive` variants.

## Decision

**Two changes to `distribute-workflow-template.yml`:**

1. **Extend distribution scope**: add `templates/skill-sync.yml` alongside
   `templates/workflows/skill-contribute.yml` as a distributed artifact, and add
   `templates/skill-sync.yml` to the `push` trigger paths.

2. **Guard for custom variants**: before writing `skill-sync.yml` to any repo, decode
   the existing file and check for `skill-sync-reusable.yml` in its content. Repos whose
   existing `skill-sync.yml` does not contain that string are skipped with
   `⏭ skipped (custom variant)` in the summary. Only the standard `send_reusable`
   variant is overwritten by template updates.

The `project-life-130` bug (github.token for PR creation) is fixed separately in that
repo directly (PR #23, ADR 0014 in project-life-130).

## Consequences

- Future changes to `templates/skill-sync.yml` automatically propagate to all 68
  standard-variant enrolled repos on merge to main.
- Custom `receive`-direction repos (`project-life-130`, `project-life-132`) are
  protected from accidental overwrites and must be maintained independently.
- The guard is content-based (`skill-sync-reusable.yml` string presence), not
  name-based — robust to repo renaming but would miss a custom workflow that
  coincidentally contains that string.

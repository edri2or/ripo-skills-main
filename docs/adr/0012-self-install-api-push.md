# ADR 0012 — Use GitHub API for self-install instead of git push

**Status:** Accepted  
**Date:** 2026-04-20

## Context

ADR 0011 introduced the `self-install` job in `distribute-skills.yml`. The job used
`git push` (via `GITHUB_TOKEN`) to write updated skill files to `.claude/commands/` on
main. This failed silently: main is a protected branch and `GITHUB_TOKEN` cannot push
directly to it, even with `permissions: contents: write`, unless the repository has
"Allow GitHub Actions to bypass branch protection" enabled.

Symptom: `distribute-skills.yml` run #39 failed — `.claude/commands/e2e-test-writer.md`
was never written after the first real trigger on main.

## Decision

Replace the `git commit + git push` approach in `self-install` with a GitHub API `PUT`
call using `RIPO_SKILLS_MAIN_PAT`, the same PAT token already used by the `distribute`
job for writing to enrolled repos. This token has repository write access and is not
blocked by branch protection rules.

## Consequences

**Positive:**
- `self-install` can write to `.claude/commands/` on protected main without requiring
  bypass actor configuration.
- Consistent with how the `distribute` job writes to enrolled repos (same pattern).
- `permissions: contents: write` is no longer needed on the `self-install` job.

**Negative:**
- `self-install` now depends on `RIPO_SKILLS_MAIN_PAT` being valid; a rotated or expired
  token will cause the job to fail (same risk already present in `distribute`).

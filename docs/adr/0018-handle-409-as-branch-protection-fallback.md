# ADR 0018 — Handle HTTP 409 as Branch-Protection Fallback in distribute-skills.yml

**Date:** 2026-04-21
**Status:** Accepted

## Context

`distribute-skills.yml` distributes exported skills to enrolled repositories by writing
directly to `.claude/commands/<skill>.md` via the GitHub Contents API. When a repo has
branch protection that blocks direct pushes, the API returns an error and the workflow
falls back to opening a PR instead.

The workflow previously handled only HTTP 422 (Unprocessable Entity) as the signal to
fall back to a PR. However, `edri2or/project-life-130` has `enforce_admins: true` in its
branch protection configuration, which causes GitHub to return HTTP 409 (Conflict) instead
of 422 when a direct write is blocked. This was treated as a hard failure, preventing the
skill from being distributed to that repo.

## Decision

Extend the branch-protection fallback condition to include both 409 and 422:

```python
elif err in (409, 422):
    # open a PR instead of direct push
```

This ensures repos with `enforce_admins: true` receive skills via PR rather than causing
a hard failure in the distribute workflow.

## Consequences

- `project-life-130` (and any other repo with `enforce_admins: true`) will receive skills
  via an auto-opened PR instead of a direct commit.
- No change in behaviour for repos that accept direct writes (they still get ✅ direct).
- No change in behaviour for repos that return 422 (they already get PR fallback).

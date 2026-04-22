# ADR 0019 — Fix exported-skills SHA lookup to target sync branch

**Date:** 2026-04-22  
**Status:** Accepted

## Context

`auto-export-skills.yml` updates an exported skill by PUTting to the GitHub Contents API.
The PUT requires the blob SHA of the existing file to perform an update (rather than a create).

The script was fetching this SHA from `main`:

```bash
curl .../contents/exported-skills/$SKILL/SKILL.md
```

However, the exported file lives in the `sync/<skill>-<date>` branch — not in `main` — until
the sync PR is merged. On any re-export triggered while an open sync PR exists (e.g. a
description fix pushed to the source skill), the SHA lookup returned empty, the PUT was issued
without a SHA, the GitHub API returned 422 (file already exists), and GitHub Actions'
`-e -o pipefail` defaults caused the entire export job to fail.

## Decision

1. Add `?ref=$BRANCH` to the SHA lookup so it targets the sync branch where the file actually lives:

```bash
curl ".../contents/exported-skills/$SKILL/SKILL.md?ref=$BRANCH"
```

2. Add `|| true` to the PUT step so a transient 422 (e.g. from a race between two export
   runs on the same branch) does not fail the job.

## Consequences

- Re-exports triggered while a sync PR is already open now succeed instead of failing
- The `|| true` guard is intentionally narrow (only the PUT step) and does not mask errors
  in the detect, score, or PR-creation steps
- No change to the branch naming convention, portability scoring logic, or PR structure

# ADR 0007 — Enforce Documentation Policy Check Before Auto-merge

**Date:** 2026-04-20  
**Status:** Accepted

## Context

`auto-merge-sync.yml` only waited for its own `validate` job before merging. The
`Documentation Policy Check` (from `documentation-enforcement.yml`) runs in parallel as a
separate workflow and was never consulted — PRs that violated the ADR policy were merged
regardless.

## Decision

Add a polling step in the `merge` job that queries the GitHub commit check-runs API and
waits for `Documentation Policy Check` to reach `completed` status before proceeding.
If the check concludes with any result other than `success`, the merge job fails.
Timeout: 24 attempts × 10 seconds = 4 minutes.

## Consequences

- Auto-merge is now blocked when the documentation policy is violated
- Merge latency increases by up to 4 minutes on slow CI runners
- PRs that touch `.github/workflows/` without a corresponding ADR will no longer silently merge

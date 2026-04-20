# ADR 0004 — Auto-Export Skills Workflow

**Date:** 2026-04-20  
**Status:** Accepted

## Context

Skills created directly in `.claude/plugins/engineering-std/skills/` were not automatically exported to `exported-skills/`, which meant `distribute-skills.yml` never ran for them. The full sync pipeline (templatizer → `sync/` PR → auto-merge → distribute) required manual execution of `/skill-templatizer` and manual PR creation.

## Decision

Add `.github/workflows/auto-export-skills.yml` — a workflow that triggers on any push touching `.claude/plugins/*/SKILL.md`. It:

1. Detects changed skill names from the diff
2. Runs the templatizer (portability scoring + placeholder synthesis)
3. Creates a `sync/<skill>-<date>` branch in this repo
4. Opens a PR targeting `main`

The existing `auto-merge-sync.yml` (which matches `sync/` branches) then auto-merges the PR, and `distribute-skills.yml` pushes the exported skill to all enrolled repos.

## Consequences

- The full pipeline (create skill → distribute to all repos) is now fully automatic with no manual steps
- The `sync/` branch naming convention (Hard Rule 6 in `CLAUDE.md`) is required for auto-merge to trigger
- A new skill added via any branch will produce a separate `sync/` PR for its export; the two PRs are independent

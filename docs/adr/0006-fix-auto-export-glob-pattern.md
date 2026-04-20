# ADR 0006 — Fix auto-export-skills Path Glob Pattern

**Date:** 2026-04-20  
**Status:** Accepted

## Context

ADR 0004 introduced `auto-export-skills.yml` with trigger path `.claude/plugins/*/SKILL.md`.
In GitHub Actions, `*` matches exactly one path segment. The actual skill path structure is
`.claude/plugins/<plugin>/skills/<skill-name>/SKILL.md` — three segments deep — so the
trigger never fired.

## Decision

Change the trigger path to `.claude/plugins/**/SKILL.md` using `**` (recursive glob),
which matches any depth under `.claude/plugins/`.

## Consequences

- `auto-export-skills.yml` now correctly triggers on new or updated skill files at any nesting depth
- No other workflows or policies are affected

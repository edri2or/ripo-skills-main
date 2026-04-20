# ADR 0005 — Inline Adapter in Distribute Workflow

**Date:** 2026-04-20  
**Status:** Accepted

## Context

Skills exported from `ripo-skills-main` contained generic placeholders (`[your-journey-file]`, `[your-railway]`, etc.) injected by `skill-templatizer`. These placeholders were left unresolved in enrolled repos unless a developer manually ran `/skill-adapter` after receiving the skill.

## Decision

Embed adapter logic directly in `distribute-skills.yml`. For each enrolled repo, before pushing the skill:

1. Fetch the repo's full file tree via `GET /repos/{repo}/git/trees/main?recursive=1` (one API call per repo)
2. Build a resolution map: check which known files (`JOURNEY.md`, `railway.json`, etc.) exist in the tree
3. Apply substitutions to the skill body (skipping code blocks)
4. Push the adapted content

## Consequences

- Skills arrive already adapted to each target repo — no manual `/skill-adapter` step needed
- One additional GitHub API call per enrolled repo per distribution run
- Pattern-based heuristics (searching file contents) are not implemented — file existence is sufficient for all current placeholders
- The `skill-adapter` slash command remains available for manual re-adaptation if needed

# ADR 0011 — Self-Install Exported Skills to ripo-skills-main .claude/commands/

**Status:** Accepted  
**Date:** 2026-04-20  
**Deciders:** claude-sonnet-4-6 (autonomous agent)

---

## Context

Skills contributed from enrolled repos flow through the reverse pipeline and land in
`exported-skills/<skill>/SKILL.md` in ripo-skills-main. The `distribute-skills.yml`
workflow then pushes each skill as `.claude/commands/<skill>.md` to all enrolled repos.

However, `distribute-skills.yml` explicitly skips `edri2or/ripo-skills-main` when
distributing (it is not enrolled via `skill-sync.yml`). As a result, ripo-skills-main
itself never receives the installed command files — making skills from the reverse
pipeline unavailable locally (e.g., `/industry-standard` returned "Unknown command").

## Decision

Add a `self-install` job to `distribute-skills.yml` that runs in parallel with the
existing `distribute` job. On every push to `exported-skills/*/SKILL.md` on main:

1. Detect which exported skills changed (same logic as `distribute`).
2. For each skill: strip the SKILL.md frontmatter and write the body to
   `.claude/commands/<skill>.md` directly in this repo.
3. Commit and push via `GITHUB_TOKEN` (no PAT required — self-repo write).

Both jobs pin `actions/checkout` to `ref: github.sha` so that `self-install`'s
follow-up commit cannot shift HEAD and corrupt `distribute`'s diff detection.

## Consequences

- **Positive:** ripo-skills-main always has an up-to-date `.claude/commands/` reflecting
  every exported skill — zero manual intervention required.
- **Positive:** No new secrets or tokens needed; `GITHUB_TOKEN` with `contents: write`
  is sufficient for the self-commit.
- **Positive:** Parallel execution adds no latency to the existing `distribute` job.
- **Negative:** `self-install`'s commit creates a new HEAD on main after each skill
  export; SHA pinning mitigates the race but adds a subtle coupling to the trigger SHA.
- **Limitation:** Skill deletions from `exported-skills/` are not yet handled — only
  additions and updates. A follow-up ADR should address deletion propagation if needed.

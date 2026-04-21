# Skill Authoring Guide

This guide covers everything needed to write a skill that will pass the automated
pipeline — whether contributed from an enrolled repo (reverse pipeline) or created
directly in `ripo-skills-main` (forward pipeline).

---

## Frontmatter Requirements

Every `SKILL.md` must open with a valid YAML frontmatter block. The `validate` job in
`auto-merge-sync.yml` enforces these rules on every `sync/` PR — a violation blocks auto-merge.

```yaml
---
name: your-skill-name          # kebab-case, matches directory name
description: "One sentence."   # ≤ 250 characters — hard limit enforced by CI
allowed-tools:                 # at least one entry required
  - Read
  - Bash(git status)
---
```

### Hard limits

| Field | Rule | CI error if violated |
|-------|------|----------------------|
| `name` | required | `missing required field: name:` |
| `description` | required, **≤ 250 chars** | `description too long: N > 250 chars` |
| `allowed-tools` | required | `missing required field: allowed-tools:` |

The 250-char limit is intentional — it forces a sharp one-line summary. If your description
is longer, trim it: context and caveats belong in the skill body, not the frontmatter.

---

## Portability Scoring (reverse pipeline only)

When a skill is contributed from an enrolled repo via `skill-contribute.yml`, the
templatizer scores it and replaces project-specific references if the score is below 80.

### What reduces the score

| Reference type | Penalty | Example |
|---|---|---|
| Project journal files | −15 each | `JOURNEY.md`, `PRODUCT.md`, `AGENT.md`, `REGISTRY.md` |
| Infrastructure services | −10 each | `Railway`, `Cloudflare`, `Supabase`, `Vercel`, `TypeORM`, `Prisma` |
| Absolute paths | −15 each | `` `/stage1-bootstrap` ``, `` `/some/hardcoded/path` `` |
| `dev/changes/` or `dev/ideas/` paths | −15 each | `dev/ideas/my-feature` |
| Non-`core` `source-experiment` value | −20 | `source-experiment: "my-experiment"` |

### What happens at each threshold

| Score | Action | Result |
|-------|--------|--------|
| ≥ 80 | **Direct export** | Skill exported as-is |
| < 80 | **Synthesized** | Placeholders substituted; `synthesis-required: true` added |

### Placeholder substitution

The templatizer replaces references with generic placeholders:

| Original | Placeholder |
|---|---|
| `JOURNEY.md` | `[your-journey-file]` |
| `PRODUCT.md` | `[your-product-file]` |
| `Railway` | `[your-railway]` |
| `Cloudflare` | `[your-cloudflare]` |
| `dev/changes/my-slug` | `dev/changes/[your-changes-slug]` |

Code blocks (` ``` `) are preserved verbatim — substitution only applies to prose.

---

## End-to-End Flow

### Reverse pipeline (enrolled repo → ripo-skills-main → all repos)

```
push SKILL.md to .claude/plugins/**/SKILL.md in any enrolled repo
  └─ skill-contribute.yml triggers
       ├─ templatizer scores + synthesizes if needed
       ├─ creates sync/<skill>-<date>-<run_id> branch in ripo-skills-main
       └─ opens PR
            └─ auto-merge-sync.yml triggers
                 ├─ validate: checks frontmatter (name, description ≤250, allowed-tools)
                 ├─ waits for Documentation Policy Check
                 └─ merges
                      └─ distribute-skills.yml triggers
                           └─ pushes .claude/commands/<skill>.md to all enrolled repos
```

### Forward pipeline (ripo-skills-main → enrolled repos)

```
push SKILL.md to .claude/plugins/**/SKILL.md in ripo-skills-main
  └─ auto-export-skills.yml triggers
       ├─ creates sync/<skill>-<date> branch
       └─ opens PR
            └─ auto-merge-sync.yml + distribute-skills.yml (same path as above)
```

---

## Known Failure Modes

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `validate` fails: `description too long` | `description` > 250 chars | Shorten to ≤ 250 chars and push to the `sync/` branch |
| `validate` fails: `missing required field` | `name`, `description`, or `allowed-tools` absent | Add the missing field |
| `skill-contribute.yml` not found in enrolled repo | Repo enrolled after last distribution | Re-run `distribute-workflow-template.yml` via `workflow_dispatch` |
| PR not opened after push | Skill path doesn't match `.claude/plugins/**/SKILL.md` | Check directory structure and glob |
| Skill not delivered to branch-protected repo | Branch protection blocks direct push (422) | `distribute-skills.yml` opens a `sync/` PR automatically (ADR 0015) — merge the PR in the enrolled repo |
| `distribute-skills` job fails with hard error | `RIPO_SKILLS_MAIN_PAT` expired or lacks `contents: write` + `pull-requests: write` | Rotate the token in repository secrets |

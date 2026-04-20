# ADR 0009 — Manifest-Driven Placeholder Adaptation in distribute-skills.yml

**Date:** 2026-04-20  
**Status:** Accepted

## Context

`distribute-skills.yml` resolves placeholders (e.g. `[your-journey-file]`) in skill bodies
before writing to each enrolled repo's `.claude/commands/`. The resolution logic was a single
flat dict of 10 hardcoded heuristics (`HEURISTICS`) mapping placeholder strings to candidate
file paths checked against the repo's file tree.

This ceiling prevented skill authors from declaring custom placeholders — any reference outside
the 10 known patterns would remain unresolved silently, arriving in enrolled repos with a literal
`[your-x]` string that Claude would have to interpret or ignore.

A `/skill-research` session (2026-04-20) evaluated three approaches to lift this ceiling:
- **Manifest-driven** (`requires:` block in SKILL.md frontmatter)
- **LLM-based** (call Claude API per repo at distribution time)
- **Semantic file matching** (embedding model in GitHub Actions runner)

## Decision

Adopt a **2-layer resolution architecture** in `distribute-skills.yml`:

### Layer 1 — per-skill manifest (`requires:` block)

Each SKILL.md may declare a `requires:` mapping in its YAML frontmatter:

```yaml
requires:
  "[your-custom-placeholder]":
    - path/to/file.ts
    - packages/sub/nested/file.ts   # suffix match handles monorepo layouts
  "[your-db]": prisma/schema.prisma
```

The distributor reads this block via `parse_fm_requires()` and resolves each placeholder
using `suffix_match()`: exact path first, then `path.endswith('/'+candidate)` to handle
monorepo subdirectory nesting. No limit on number of custom placeholders.

### Layer 2 — global HEURISTICS fallback

The existing 10 heuristics remain active for placeholders not declared in `requires:`.
This preserves backward compatibility — all existing skills without a `requires:` block
continue to work unchanged.

### Exclusions

- **LLM excluded from runtime path**: introduces non-determinism, per-repo API cost, and
  potential hallucinated file names. May be considered as an offline suggester in
  `skill-contribute.yml` (pre-merge, human-review gate) in a future ADR.
- **Semantic matching excluded**: requires an embedding model in the Actions runner;
  cost and latency outweigh benefit when the manifest covers the majority of cases.

## Consequences

- Skill authors can declare unlimited custom placeholders; the distributor resolves them
  per-repo using the actual file tree.
- `auto-export-skills.yml` and `skill-contribute.yml` require no changes — both already
  preserve frontmatter verbatim through the export pipeline.
- YAML parse errors in a `requires:` block produce a visible warning in `GITHUB_STEP_SUMMARY`
  and do not abort distribution of other skills.
- Suffix matching is deterministic (`sorted(paths)` for consistent tie-breaking in monorepos
  with multiple candidates).

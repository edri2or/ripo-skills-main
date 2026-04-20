# ADR 0010 — Regex-Based requires: Block Extraction in distribute-skills.yml

**Date:** 2026-04-20  
**Status:** Accepted

## Context

ADR 0009 introduced `parse_fm_requires()` in `distribute-skills.yml` which called
`yaml.safe_load()` on the entire frontmatter text to extract the `requires:` block.

This failed silently when other frontmatter fields contained `: ` substrings: specifically,
a `description:` value like `"manifest-driven requires: block resolution"` caused PyYAML to
raise "mapping values are not allowed here" (it misinterpreted `requires:` as a nested key).
The exception was caught, `{}` was returned, and the entire `requires:` resolution was silently
skipped — all placeholders stayed literal across all 70 enrolled repos.

The bug was caught during the E2E validation test (`e2e-requires-test` skill, 2026-04-20).

## Decision

Replace the full-frontmatter parse with a **regex-first extraction**:

1. Use `re.search(r'^requires:\s*\n((?:[ \t]+[^\n]*\n?)*)', frontmatter, re.MULTILINE)` to
   extract only the indented lines that belong to the `requires:` block.
2. Prepend `requires:\n` to the captured group to reconstruct a minimal, isolated YAML string.
3. Call `yaml.safe_load()` on only that isolated string.

This is immune to YAML-unsafe content in any other frontmatter field.

## Consequences

- `parse_fm_requires()` now works regardless of content in `description:`, `name:`, or any
  other string field in the frontmatter.
- The regex captures multi-level YAML (lists under keys) by matching all lines that begin
  with at least one whitespace character.
- Unindented lines after the `requires:` block correctly terminate the capture group.

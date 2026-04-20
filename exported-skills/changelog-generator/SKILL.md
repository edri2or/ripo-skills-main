---
name: changelog-generator
description: "Generates a structured CHANGELOG entry from recent git commits. Groups by feat/fix/chore, formats as Keep a Changelog markdown, and appends to CHANGELOG.md."
allowed-tools: Bash, Read, Edit, Write
source-experiment: core
scope: global
portability: 85
synthesis-required: false
source-repo: edri2or/project-life-130
---

# changelog-generator

Generate a CHANGELOG.md entry from recent commits before a release or at end of sprint.

## When to use

Invoke `/changelog-generator` when preparing a release or sprint summary.

## Steps

1. **Collect commits** -- `git log --oneline <range>` for the relevant range
2. **Classify** -- group by prefix: `feat:` Added, `fix:` Fixed, `chore:`/`refactor:` Changed
3. **Format** -- write a Keep a Changelog block
4. **Append** -- prepend new block at the top of CHANGELOG.md (create if missing)
5. **Confirm** -- show diff, ask for approval before writing

## Rules

- Date format: YYYY-MM-DD
- Skip merge commits and bot commits
- Max 10 bullets per section; group remaining as "and N more"
- Never delete existing CHANGELOG entries


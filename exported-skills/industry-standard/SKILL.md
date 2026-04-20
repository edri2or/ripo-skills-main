---
name: industry-standard
description: "Evaluates SKILL.md files against a 5-level industry-standard readiness scale and prints a scored compliance report. Use when you want to assess skill maturity against production-readiness criteria."
allowed-tools:
  - Read
  - Glob
  - Grep
maturity: experimental
source-experiment: core
evidence: "First use 2026-04-20."
scope: global
portability: 100
synthesis-required: false
---

# Industry Standard Scale

## Role
You are a Skill Readiness Auditor. You evaluate one or more SKILL.md files against a
5-level industry-standard readiness scale — modelled on CMMI and ISO/IEC 25010 — and
print a scored compliance report to chat. You never modify any file.

## Scale Definition

| Level | Name | Meaning |
|-------|------|---------|
| 1 | Experimental | Basic structure present; skill exists but is unverified |
| 2 | Prototype | Instructions complete; at least one usage example present |
| 3 | Validated | Safety rules defined; evidence of real-world use recorded |
| 4 | Production | Failure modes documented; portability-ready; peer-quality body |
| 5 | Certified | Full compliance across all criteria; zero known gaps |

## Scoring Criteria

Ten criteria, each worth 10 points (max score: 100):

| # | Criterion | Points |
|---|-----------|--------|
| C1 | `name` field present in frontmatter | 10 |
| C2 | `description` ≤ 250 characters | 10 |
| C3 | `allowed-tools` list present (may be empty `[]`) | 10 |
| C4 | `## Role` section present in body | 10 |
| C5 | Numbered instruction steps (`### Step N:` or ordered list) | 10 |
| C6 | `## Safety Rules` section present | 10 |
| C7 | `## Examples` section with at least one example | 10 |
| C8 | `maturity` field present in frontmatter | 10 |
| C9 | `evidence` field present (first-use date) | 10 |
| C10 | `source-experiment: core` (portability indicator) | 10 |

Score → Level mapping:

| Score | Level |
|-------|-------|
| 0–19 | 1 — Experimental |
| 20–39 | 2 — Prototype |
| 40–59 | 3 — Validated |
| 60–79 | 4 — Production |
| 80–100 | 5 — Certified |

## Instructions

### Step 1: Accept Input

The user provides one of:
- A skill name (e.g., `git-commit`)
- A path to a SKILL.md file (e.g., `.claude/plugins/engineering-std/skills/git-commit/SKILL.md`)
- The keyword `all` — evaluate every SKILL.md in `.claude/plugins/`

If no input is provided, ask:
> "Which skill should I evaluate? Provide a skill name, a path to a SKILL.md, or type `all` to scan every installed skill."

### Step 2: Resolve Targets

**Single skill by name:**
Use Glob with pattern `.claude/plugins/**/skills/<name>/SKILL.md` to locate the file.
If not found, try `.claude/commands/<name>.md`.
If still not found, print: `"Skill '<name>' not found. Check the name or provide a full path."`

**Explicit path:**
Use Read directly on the provided path.

**`all`:**
Use Glob with pattern `.claude/plugins/**/SKILL.md` to collect all targets.
Also include `.claude/commands/*.md` if no plugin matches are found.

### Step 3: Evaluate Each Skill

For each resolved SKILL.md file, Read the full content then apply all 10 criteria:

**C1 — name present:**
Check frontmatter for a line matching `^name:`. Pass if found and non-empty.

**C2 — description ≤ 250 chars:**
Extract the `description:` value (strip surrounding quotes). Pass if length ≤ 250.
If description is absent, fail C2 (also note C1-adjacent gap).

**C3 — allowed-tools present:**
Check frontmatter for `allowed-tools:` block. Pass even if the list is `[]` (explicit empty is valid).
Fail only if the field is completely absent.

**C4 — Role section:**
Scan body for `## Role` heading. Pass if found.

**C5 — Numbered steps:**
Scan body for either `### Step` (any capitalisation) OR a markdown ordered list (`1.`, `2.`, `3.`).
Pass if at least 3 sequential steps or list items are found.

**C6 — Safety Rules:**
Scan body for `## Safety Rules` heading. Pass if found.

**C7 — Examples:**
Scan body for `## Examples` heading AND at least one `**User:**` or `**Example` pattern below it.
Pass if both are found.

**C8 — maturity field:**
Check frontmatter for `maturity:`. Pass if found and non-empty.

**C9 — evidence field:**
Check frontmatter for `evidence:`. Pass if found and non-empty.

**C10 — portability:**
Check frontmatter for `source-experiment: core`. Pass only if the value is exactly `core`.

Compute total score. Map to level using the table above.

### Step 4: Print the Report

For a single skill, print:

```
## Industry Standard Assessment — <skill-name>

**File:** <path>
**Score:** <N>/100  →  Level <L> — <Level Name>

### Criteria Results

| # | Criterion | Result | Score |
|---|-----------|--------|-------|
| C1 | name present | PASS / FAIL | 10 / 0 |
| C2 | description ≤ 250 chars | PASS / FAIL [actual: N chars] | 10 / 0 |
| C3 | allowed-tools present | PASS / FAIL | 10 / 0 |
| C4 | Role section | PASS / FAIL | 10 / 0 |
| C5 | Numbered steps | PASS / FAIL | 10 / 0 |
| C6 | Safety Rules section | PASS / FAIL | 10 / 0 |
| C7 | Examples section | PASS / FAIL | 10 / 0 |
| C8 | maturity field | PASS / FAIL | 10 / 0 |
| C9 | evidence field | PASS / FAIL | 10 / 0 |
| C10 | source-experiment: core | PASS / FAIL | 10 / 0 |

### Gaps to Advance

[List only failing criteria with one-line fix instructions. If score is 100, print "No gaps — skill is Certified."]

- C4: Add a `## Role` section describing the agent persona.
- C6: Add a `## Safety Rules` section listing what the skill must never do.

---
NOTE: This report is static analysis only. Pass/fail is based on text pattern matching.
Runtime behaviour may differ. No files were modified.
```

For `all`, print one block per skill followed by a summary table:

```
## Industry Standard Assessment — All Skills

| Skill | Score | Level | Gaps |
|-------|-------|-------|------|
| git-commit | 90/100 | 5 — Certified | C9 |
| doc-standard | 70/100 | 4 — Production | C7, C9 |
| ... | | | |

**Org readiness:** N skills at Level 4+, M skills below Level 3 (need attention).
```

## Safety Rules

1. **NEVER write to any file** — all output goes to chat only.
2. **NEVER modify any SKILL.md** — this skill is read-only on all content.
3. **NEVER assign a PASS** to a criterion without finding the required text pattern.
4. **NEVER skip the Gaps section** — even if only one criterion fails, list it.
5. **NEVER evaluate a file that is not a SKILL.md or commands/*.md** — if the resolved path points to another file type, halt and print: `"Target is not a skill file. Provide a SKILL.md path or skill name."`

## Examples

**User:** `industry-standard git-commit`

**Agent behaviour:**
Globs `.claude/plugins/**/skills/git-commit/SKILL.md`. Finds the file. Reads it.
Evaluates all 10 criteria. Finds C9 (evidence) absent. Score: 90/100 → Level 5 — Certified.
Prints the single-skill report with one gap: "Add an `evidence:` field with the first-use date."

---

**User:** `industry-standard all`

**Agent behaviour:**
Globs `.claude/plugins/**/SKILL.md`. Finds 12 files. Reads and evaluates each.
Discovers 3 skills below Level 3 (score < 40). Prints per-skill blocks then the summary table.
"Org readiness: 7 skills at Level 4+, 3 skills below Level 3 (need attention)."
No files modified.

---

**User:** `industry-standard .claude/plugins/engineering-std/skills/db-migration/SKILL.md`

**Agent behaviour:**
Uses Read directly on the provided path. Evaluates. Finds C5 fails (no `### Step` headings and
no ordered list with ≥ 3 items). Score: 80/100 → Level 5 — Certified (other criteria pass).
Prints report with one gap: "Restructure instructions using `### Step N:` headings or a numbered list."

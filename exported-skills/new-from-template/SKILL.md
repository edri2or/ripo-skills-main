---
name: new-from-template
description: "Create a new GitHub repo from a template and rename all template references to the new project name. Use when scaffolding a new project from a template repo in one step."
allowed-tools:
  - Bash(gh repo *)
  - Bash(git clone *)
  - Bash(sleep *)
  - Read
  - Grep
  - Edit
  - Write
maturity: experimental
source-experiment: core
evidence: "First use 2026-04-19."
scope: global
portability: 85
synthesis-required: false
---

# New From Template

## Role
You are a Project Scaffolding Orchestrator who creates a new GitHub repository
from a template, clones it locally, and renames all template references to the
new project name — reporting results and next steps to chat.

## Instructions

### Step 1: Validate Inputs

Expect two required arguments: `OWNER/TEMPLATE-REPO` and `NEW-REPO-NAME`.
Accept an optional `--private` or `--public` flag (default: `--private`).

Validate:
- `OWNER/TEMPLATE-REPO` — must match `owner/repo` pattern (two segments, each
  containing only letters, digits, hyphens, underscores, or dots).
- `NEW-REPO-NAME` — must contain only letters, digits, hyphens, underscores,
  or dots (no spaces, no slashes).

If either is invalid, stop and output the specific format error before proceeding.

### Step 2: Create Remote Repo

Run:
```
gh repo create NEW-REPO-NAME --template OWNER/TEMPLATE-REPO --private
```
(substitute `--public` if specified)

On failure:
- HTTP 404 → `Template OWNER/TEMPLATE-REPO not found. Check the name and your access.`
- Name conflict → `A repo named NEW-REPO-NAME already exists in your account.`
- Other → print the raw gh error and stop.

Report: `Remote repo created: https://github.com/YOUR-LOGIN/NEW-REPO-NAME`

### Step 3: Clone With Retry

Run `git clone https://github.com/YOUR-LOGIN/NEW-REPO-NAME` where YOUR-LOGIN
is resolved from `gh repo view YOUR-LOGIN/NEW-REPO-NAME --json owner -q .owner.login`
or inferred from the create output.

If clone fails, wait 3 seconds and retry — up to 3 attempts total.

If all 3 attempts fail:
```
Clone failed after 3 attempts. The remote repo was created successfully at:
  https://github.com/YOUR-LOGIN/NEW-REPO-NAME
Run manually: git clone https://github.com/YOUR-LOGIN/NEW-REPO-NAME
```
Stop. Do not continue to cleanup.

After a successful clone, `cd` into the new directory before proceeding.

### Step 4: Detect Template Name

Read `.claude/template-source` in the cloned directory.

- If found: use its trimmed content as TEMPLATE-NAME.
  Report: `Detected template name: TEMPLATE-NAME → new project: NEW-REPO-NAME`
- If missing: output:
  ```
  .claude/template-source not found in the cloned repo.
  Remote repo exists: https://github.com/YOUR-LOGIN/NEW-REPO-NAME
  What is the source template name? (the name used in this template's files)
  ```
  Wait for the user's answer before continuing.

### Step 5: Scan for References

# Inline of cleanup-template logic — keep in sync with
# .claude/plugins/global/skills/cleanup-template/SKILL.md

Search the cloned directory for all occurrences of TEMPLATE-NAME (exclude `.git/`):
- output_mode: content
- show file path, line number, matching line

Build a replacement table:

| File | Line | Current text | Proposed text |
|------|------|--------------|---------------|
| ...  | ...  | ...TEMPLATE-NAME... | ...NEW-REPO-NAME... |

If zero occurrences found: output `No template references found — nothing to replace.`
and skip to Step 7.

### Step 6: Confirm and Apply

Show the table and ask:
> "Found [N] occurrence(s) in [M] file(s). Shall I replace all of them with
> `NEW-REPO-NAME`?"

Do not proceed until the user confirms.

Read all matched files in parallel, then for each apply Edit with
`replace_all: true`, `old_string: "TEMPLATE-NAME"`, `new_string: "NEW-REPO-NAME"`.

Overwrite `.claude/template-source` with `NEW-REPO-NAME` using Write.

### Step 7: Report Summary

Output:
```
Done. New project scaffolded from OWNER/TEMPLATE-REPO.

Remote: https://github.com/YOUR-LOGIN/NEW-REPO-NAME
Local:  ./NEW-REPO-NAME/

Replaced TEMPLATE-NAME → NEW-REPO-NAME in [N] file(s):
  - file1 ([k] occurrence(s))
  - file2 ([k] occurrence(s))

.claude/template-source updated to NEW-REPO-NAME.
Run /git-commit to commit the cleanup changes.
```

## Safety Rules

1. **Never commit or push** — this skill edits files only; always direct the
   user to `/git-commit` for the final step.
2. **Never modify source template repo** — all edits apply exclusively to the
   newly cloned directory.
3. **Never apply replacements** without first showing the replacement table
   and receiving explicit user confirmation in Step 6.
4. **If clone fails after all retries**, surface the orphaned remote repo URL
   and stop — never silently abandon a created remote repo.

## Examples

**User:** `/new-from-template acme/service-template my-new-api`

**Agent behaviour:** Validates inputs, creates `my-new-api` as a private repo
from `acme/service-template`, clones with retry logic, reads
`.claude/template-source` (finds `service-template`), scans and finds 8
occurrences in 5 files, shows replacement table, waits for confirmation,
applies all edits, updates `.claude/template-source`, reports summary and
directs user to `/git-commit`.

**User:** `/new-from-template acme/service-template my-new-api --public`

**Agent behaviour:** Same flow but creates the repo as public. If clone fails
all 3 retries, outputs the remote URL with a manual clone command and stops
without touching any files — leaving the user with a recovery path.

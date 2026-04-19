# JOURNEY.md — Session Journal

This file is the narrative log of all development sessions in this repository.
Each entry captures the chain of thought, decisions made, and actions taken.
It is the primary audit trail for autonomous agent activity.

**Append-only. Never delete or modify previous entries.**

---

## [2026-04-15] Activate Branch Protection — Required Status Check on main

**Operator**: claude-sonnet-4-6 (autonomous agent)
**Scope**: GitHub Branch Protection settings (no source code changes)
**Objective**: Complete the documentation enforcement loop by making
`doc-policy-check` a Required Status Check on `main`, so the gate
physically blocks merges that violate documentation policies.

### Actions Taken
- Verified the `GH_TOKEN` session variable has `admin: true` on the repo
- Called `PUT https://api.github.com/repos/edri2or/project-life-107/branches/main/protection`
  with `required_status_checks.checks = [{"context": "Documentation Policy Check"}]`
- Confirmed the API returned HTTP 200 with the active protection rule
- Created this branch and PR to document the change per the JOURNEY.md policy

### Decisions Made
- Used `required_status_checks.strict = false` — branch does not need to be
  up-to-date with main before merging (avoids unnecessary friction)
- `enforce_admins = false` — admins can bypass if needed for emergency hotfixes;
  this can be tightened later via a follow-up ADR
- Secret (`GH_TOKEN`) used only in a transient shell command; never committed
  to any file or logged

### Open Items / Follow-ups
- [ ] Consider `enforce_admins = true` once the workflow is stable
- [ ] Add `required_pull_request_reviews` (at least 1 approval) for extra safety

---

## [2026-04-15] Implement Claude Skills Enterprise Infrastructure

**Operator**: claude-sonnet-4-6 (autonomous agent)
**Scope**: `src/agent/index.ts`, `.claude/` (plugin infrastructure), `docs/adr/0002-...`, `CLAUDE.md`
**Objective**: Materialize the full Claude Skills framework described in the strategic framework document
*"Implementing Claude Skills for Enterprise Software Engineering"*, fulfilling the open item recorded
in the initial setup session: "Populate `src/agent/` with initial agent code and update CLAUDE.md accordingly."

### Actions Taken
- Created `src/agent/index.ts` — skills router implementing `discoverSkills()`, `routeIntent()` (Jaccard
  similarity), and `activateSkill()` (Progressive Disclosure pattern); zero npm dependencies.
- Created `.claude/settings.json` — global permission model (Read/Grep auto-approved, Write/Edit/Bash
  require user confirmation).
- Created `.claude/plugins/engineering-std/.claude-plugin/plugin.json` — plugin manifest listing 7 skills.
- Created `.claude/plugins/engineering-std/.mcp.json` — bundles 5 MCP servers: `filesystem`, `github`,
  `postgres`, `deep-research`, `memory` (ChromaDB).
- Created 7 SKILL.md files under `.claude/plugins/engineering-std/skills/`:
  - `git-commit` — Conventional Commits enforcement
  - `db-migration` — TypeORM/PostgreSQL migration workflow with pre/post schema verification
  - `doc-standard` — Markdown style-guide enforcement
  - `doc-updater` — Source ↔ docs drift detection (Phase 1 MVP)
  - `scaffold-feature` — Clean Architecture boilerplate from templates (Phase 2 Beta)
  - `safe-refactor` — Test-first refactor loop with self-correction (Phase 3 Production)
  - `enterprise-feature-scaffold` — Appendix A reference implementation (verbatim from framework doc)
- Created resource files: `style-guide.md`, `architecture-diagram.md`, `verify_schema.py`, and
  TypeScript templates (`Controller.ts`, `Service.ts`, `Repository.ts`) for both scaffold skills.
- Created `docs/adr/0002-claude-skills-enterprise-infrastructure.md` — documents the architectural
  decision to adopt the Skills plugin architecture and 5 MCP server dependencies.
- Updated `CLAUDE.md` — added `src/agent/index.ts` to the repository tree, documented the three
  exported router functions, and updated the "Last Updated" section.

### Decisions Made
- **Jaccard similarity** chosen over cosine/embedding similarity for the skills router to keep
  `src/agent/index.ts` dependency-free (no npm packages required at runtime).
- **Progressive Disclosure**: `discoverSkills()` reads only YAML frontmatter; `activateSkill()` loads
  the full body only when a match is confirmed — minimizes context window usage.
- **`safe-refactor` HITL gate**: `plan_mode_required` is documented as mandatory in the skill;
  self-correction loop is capped at 3 attempts to prevent runaway agent behaviour.
- **Templates use `{{Entity}}` placeholder** (double curly-braces) to remain engine-agnostic;
  the scaffold skill substitutes them in-agent without requiring a template engine dependency.
- **ChromaDB MCP is optional**: listed in `.mcp.json` but startup will not block if `CHROMA_HOST`
  is unavailable; developers can opt in when long-term memory is needed.

### Open Items / Follow-ups
- [ ] Add `package.json` + `tsconfig.json` if the team wants to compile `src/agent/index.ts` to JS.
- [ ] Wire `src/agent/index.ts` into a Claude Code hook (e.g., `SessionStart`) for automatic skill discovery.
- [ ] Populate `I{{Entity}}Repository` interface template once a domain model is established.
- [ ] Configure `GITHUB_TOKEN` and `DATABASE_URL` as repository secrets for CI environments.

---

## Entry Template

```
## [YYYY-MM-DD] Session Title

**Operator**: <human | agent-id>
**Scope**: <files/areas touched>
**Objective**: <what was the goal of this session>

### Actions Taken
- ...

### Decisions Made
- ...

### Open Items / Follow-ups
- ...
```

---

## [2026-04-15] Initial Repository Setup — Documentation Enforcement Infrastructure

**Operator**: claude-sonnet-4-6 (autonomous agent)
**Scope**: Entire repository (greenfield setup)
**Objective**: Implement the 4-layer documentation enforcement architecture as described in the
research document "אכיפת תיעוד וניהול מדיניות-כקוד במערכות סוכנים אוטונומיים (2026)".

### Actions Taken
- Created `CLAUDE.md` — Layer 1 agent context file defining project purpose, rules, and path conventions
- Created `JOURNEY.md` — this file, establishing the session journal convention
- Created `docs/adr/README.md` — ADR index with status table
- Created `docs/adr/0001-documentation-enforcement-setup.md` — first ADR documenting the architectural decision
  to adopt Policy-as-Code enforcement
- Created `policy/journey.rego` — Rego policy: blocks PR if `src/` changes without `JOURNEY.md` update
- Created `policy/claude.rego` — Rego policy: blocks PR if `src/agent/` changes without `CLAUDE.md` update
- Created `policy/adr.rego` — Rego policy: blocks PR if infra/dependency changes without new ADR
- Created `scripts/generate_diff.sh` — bash bridge that converts `git diff` output to JSON for Conftest
- Created `.github/workflows/documentation-enforcement.yml` — CI workflow that runs all policies as a blocking gate
- Updated `README.md` — replaced placeholder with full project description

### Decisions Made
- Chose OPA/Conftest over Kyverno for policy enforcement (Kyverno is Kubernetes-native and does not natively
  handle arbitrary file-change topologies in a Git repository)
- Combined deterministic enforcement (Rego) with a hybrid AI layer stub (pr_compliance_checklist.yaml reference
  in CLAUDE.md) for future semantic validation via Qodo Merge
- Used `fetch-depth: 0` in the GitHub Actions checkout to guarantee full history for accurate `git diff`

### Open Items / Follow-ups
- [ ] Set `doc-policy-check` as a Required Status Check in GitHub Branch Protection settings
- [ ] Add `pr_compliance_checklist.yaml` for Qodo Merge semantic validation (Layer 4)
- [ ] Populate `src/agent/` with initial agent code and update CLAUDE.md accordingly

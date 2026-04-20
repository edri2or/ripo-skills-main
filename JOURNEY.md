# JOURNEY.md — Session Journal

This file is the narrative log of all development sessions in this repository.
Each entry captures the chain of thought, decisions made, and actions taken.
It is the primary audit trail for autonomous agent activity.

**Append-only. Never delete or modify previous entries.**

---

## [2026-04-20] Full Skill Pipeline — Forward + Reverse Architecture

**Operator**: claude-sonnet-4-6 (autonomous agent)
**Scope**: `.github/workflows/`, `.claude/plugins/engineering-std/`, `exported-skills/`, `docs/adr/`, `CLAUDE.md`, `templates/workflows/`
**Objective**: Build a complete bidirectional skill pipeline — forward (ripo-skills-main → enrolled repos) and reverse (enrolled repo → ripo-skills-main → all repos).

### Forward Pipeline — Completed and Verified

**Automation chain:**
`.claude/plugins/**/SKILL.md` push → `auto-export-skills.yml` → `sync/` PR → `auto-merge-sync.yml` (+ Doc Policy gate) → `distribute-skills.yml` (with adapter) → `.claude/commands/<skill>.md` in all enrolled repos.

**Changes made:**

| Change | ADR | PR |
|--------|-----|----|
| `auto-merge-sync.yml` — restrict to `sync/` prefix only | 0004 | #28 |
| CLAUDE.md Hard Rule #6 — `sync/` branch convention documented | — | #29 |
| `auto-export-skills.yml` — added (triggers on `.claude/plugins/**/SKILL.md`) | 0005 | #31 |
| `skill-adapter` embedded in `distribute-skills.yml` — resolves placeholders per repo | — | #33 |
| `auto-export-skills.yml` glob fix: `*` → `**` | 0006 | #35 |
| `auto-merge-sync.yml` — polling gate for Documentation Policy Check before merge | 0007 | #36 |

**Skills created and end-to-end verified:**

| Skill | Score | Action | PR | Verified in enrolled repos |
|-------|-------|--------|----|---------------------------|
| `skill-request-parser` | 85/100 | direct | #30 | ✅ 70/70 |
| `doc-research-planner` | 100/100 | direct | #38 | ✅ 70/70 |
| `deep-research-prompt-builder` | 100/100 | direct | #41 | ✅ 70/70 |

**End-to-end test confirmed via API** (`PUSH_TARGET_TOKEN`): all 70 enrolled repos have `.claude/commands/deep-research-prompt-builder.md` — zero failures.

### Reverse Pipeline — Designed, Not Yet Distributed

**Goal:** Skill created in any enrolled repo → auto-contribute to `ripo-skills-main` → auto-merge → distribute to all other enrolled repos.

**Architecture:**
`skill-contribute.yml` (in enrolled repo) detects `.claude/plugins/**/SKILL.md` push → runs templatizer → creates `sync/<skill>-<date>` branch in `ripo-skills-main` → opens PR → existing `auto-merge-sync.yml` + `distribute-skills.yml` handle the rest.

**Status:** `skill-contribute.yml` written and saved to `templates/workflows/skill-contribute.yml`. **Distribution to all 70 enrolled repos is the next step** (interrupted before push — session context limit reached).

**Test case ready:** `stage1-bootstrap` skill exists in `edri2or/project-life-130` (`.claude/plugins/engineering-std/skills/stage1-bootstrap/SKILL.md`). Expected portability score: ~65/100 (Railway + Cloudflare + JOURNEY.md references trigger synthesis). Once `skill-contribute.yml` is distributed, a push to that skill will trigger the full reverse pipeline.

### Key Technical Decisions

- **`sync/` prefix convention**: only `auto-export-skills.yml` and `skill-contribute.yml` create `sync/` branches — all human/agent branches use other prefixes and require manual merge.
- **Templatizer score threshold**: `< 80` → `synthesis-required: true`, placeholders replaced; `≥ 80` → direct export.
- **Adapter in distribute**: `build_resolution_map(repo)` fetches the full file tree once per repo via `GET /git/trees/main?recursive=1` and resolves all placeholders in one pass — no extra API calls per placeholder.
- **`source-repo` metadata**: added to `skill-contribute.yml` output so `ripo-skills-main` knows which repo originated each contributed skill.

### Open Items
- [ ] Distribute `skill-contribute.yml` to all 70 enrolled repos
- [ ] Verify reverse pipeline with `stage1-bootstrap` from `project-life-130`
- [ ] Add ADR for reverse pipeline (workflow change in enrolled repos)
- [ ] Consider deduplication: if a skill name already exists in `exported-skills/`, contribute as update (SHA already handled) vs. new skill

---

## [2026-04-15] Activate Branch Protection — Required Status Check on main

**Operator**: claude-sonnet-4-6 (autonomous agent)
**Scope**: GitHub Branch Protection settings (no source code changes)
**Objective**: Complete the documentation enforcement loop by making
`doc-policy-check` a Required Status Check on `main`, so the gate
physically blocks merges that violate documentation policies.

### Actions Taken
- Verified the `GH_TOKEN` session variable has `admin: true` on the repo
- Called `PUT https://api.github.com/repos/edri2or/ripo-skills-main/branches/main/protection`
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

## [2026-04-19] Session-Start Hook and npm TypeScript Dev Toolchain

**Operator**: claude-sonnet-4-6 (autonomous agent)
**Scope**: `.claude/hooks/session-start.sh`, `.claude/settings.json`, `package.json`, `tsconfig.json`, `src/agent/index.ts` (prettier format), `docs/adr/0003-npm-typescript-dev-toolchain.md`
**Objective**: Bootstrap the development environment for Claude Code on the web sessions by creating a `SessionStart` hook, and resolve the open item from the 2026-04-15 session to add `package.json` + `tsconfig.json`.

### Actions Taken
- Created `.claude/hooks/session-start.sh` — `SessionStart` hook that runs only in remote (`CLAUDE_CODE_REMOTE=true`) environments, ensures `/opt/node22/bin` is on PATH, and runs `npm install` to install dev dependencies.
- Registered the hook in `.claude/settings.json` under `hooks.SessionStart`.
- Created `package.json` with `@types/node`, `prettier`, and `typescript` as dev dependencies; added `typecheck` and `lint` npm scripts.
- Created `tsconfig.json` with `CommonJS` module, `strict` mode, `@types/node` types, and `ignoreDeprecations: 6.0` to suppress the `moduleResolution=node` deprecation warning in TypeScript 6.x.
- Applied `prettier --write` to `src/agent/index.ts` to bring it into conformance with the formatter.
- Created `docs/adr/0003-npm-typescript-dev-toolchain.md` documenting the decision to add the npm dev toolchain.

### Decisions Made
- Hook is **synchronous** (no `async` JSON header) to guarantee dev dependencies are installed before the session's agent loop starts, preventing race conditions where `tsc` or `prettier` are invoked before `node_modules` exists.
- Hook is **web-only** (`CLAUDE_CODE_REMOTE` guard) — local developers manage their own `npm install`.
- `prettier` chosen as the formatter (already globally available at `/opt/node22/bin/prettier`) with no additional config file to keep setup minimal.
- `ignoreDeprecations: "6.0"` used in `tsconfig.json` to silence the `moduleResolution=node10` deprecation warning; `module: CommonJS` + `moduleResolution: node` remains the correct choice for a `ts-node`-executed CJS module.

### Decisions Closed
- ✅ Open item from 2026-04-15: "Add `package.json` + `tsconfig.json` if the team wants to compile `src/agent/index.ts` to JS."

### Open Items / Follow-ups
- [ ] Consider switching `moduleResolution` to `bundler` or `node16` in a future TypeScript 7.x migration.
- [ ] Add `eslint` with `@typescript-eslint` for lint-level code quality checks beyond formatting.

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

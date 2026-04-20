# CLAUDE.md — Agent Context File

This file is the primary context document for autonomous AI agents operating in this repository.
It defines the project's purpose, architectural boundaries, and hard rules that govern agent behavior.
**Every session must begin by reading this file.**

---

## Project Purpose

`ripo-skills-main` is a reference implementation of a **4-layer documentation enforcement system** for
autonomous AI agent workflows. It demonstrates how Policy-as-Code (PaC) techniques can be applied to
ensure that documentation never drifts from the codebase, preventing "cognitive hallucinations" in agents
that rely on documentation as their operative memory.

---

## Repository Architecture

```
ripo-skills-main/
├── CLAUDE.md                        # THIS FILE — Layer 1: agent context
├── JOURNEY.md                       # Layer 3: session journal
├── src/                             # Source code (triggers doc enforcement)
│   └── agent/                       # Agent-specific logic (triggers CLAUDE.md update)
│       └── index.ts                 # Skills router: discovery, routing, activation
├── docs/
│   └── adr/                         # Layer 2: Architecture Decision Records
├── policy/                          # OPA/Rego enforcement policies
│   ├── claude.rego
│   ├── adr.rego
│   └── journey.rego
├── scripts/
│   └── generate_diff.sh             # Git diff → JSON bridge for Conftest
├── .claude/                         # Claude Code agent configuration
│   ├── settings.json                # Global permission model
│   └── plugins/
│       └── engineering-std/         # Standard engineering skills plugin
│           ├── .claude-plugin/
│           │   └── plugin.json      # Plugin manifest
│           ├── .mcp.json            # Bundled MCP server configurations
│           └── skills/              # 7 skills (git-commit, db-migration, doc-standard,
│               └── ...              #   doc-updater, scaffold-feature, safe-refactor,
│                                    #   enterprise-feature-scaffold)
└── .github/workflows/
    └── documentation-enforcement.yml  # CI blocking gate
```

---

## 4-Layer Documentation Architecture

| Layer | File/Path | Triggered by |
|-------|-----------|--------------|
| 1 | `CLAUDE.md` | Changes under `src/agent/` |
| 2 | `docs/adr/*.md` | Changes to `package.json`, `terraform/`, `infra/` |
| 3 | `JOURNEY.md` | Any change under `src/` |
| 4 | Artifacts (diagrams, schemas) | Changes to API definitions or topology files |

---

## Hard Rules for the Agent

1. **Never** merge a PR that modifies `src/agent/` without a corresponding update to this file (`CLAUDE.md`).
2. **Never** merge a PR that introduces a new dependency or infrastructure change without a new ADR in `docs/adr/`.
3. **Never** merge a PR that modifies source code (`src/`) without appending an entry to `JOURNEY.md`.
4. ADRs are **immutable** once accepted. To supersede an ADR, create a new one and mark the old one `Superseded`.
5. All policy violations are caught by `policy/*.rego` and enforced via `.github/workflows/documentation-enforcement.yml` as a **required** status check.
6. **Branch naming for skill PRs:** Any branch that adds or updates a skill and should be auto-merged via `auto-merge-sync.yml` **must** start with `sync/`. Branches using other prefixes (e.g. `claude/`, `feat/`) will be skipped by the auto-merge workflow and require manual merge.

---

## Path Conventions

| Path | Purpose |
|------|---------|
| `src/` | All source code |
| `src/agent/` | Agent-specific logic — changes here require CLAUDE.md update |
| `src/agent/index.ts` | Skills router: `discoverSkills()`, `routeIntent()`, `activateSkill()` |
| `docs/adr/` | Architecture Decision Records (format: `NNNN-<slug>.md`) |
| `policy/` | Rego policies consumed by Conftest |
| `scripts/` | CI helper scripts |
| `.claude/settings.json` | Global Claude Code permission model |
| `.claude/plugins/engineering-std/` | Standard engineering skills plugin (7 skills + 5 MCP servers) |
| `docs/skill-authoring.md` | Skill authoring guide: frontmatter rules, portability scoring, failure modes |

---

## Policy Enforcement Summary

The CI workflow (`documentation-enforcement.yml`) runs on every PR and:
1. Generates a JSON diff of changed files via `scripts/generate_diff.sh`
2. Evaluates all `policy/*.rego` rules with Conftest
3. **Blocks merge** if any `deny` rule fires

To bypass enforcement, a team lead must explicitly remove the "Required" status check in Branch Protection settings — this action itself must be recorded in an ADR.

---

## Agent Implementation

`src/agent/index.ts` is the skills router. It provides three exported functions:

| Function | Signature | Description |
|----------|-----------|-------------|
| `discoverSkills` | `(projectRoot?: string) => SkillMeta[]` | Scans `.claude/plugins/` and extracts YAML frontmatter from every SKILL.md (lightweight — no body loaded). |
| `routeIntent` | `(intent: string, skills: SkillMeta[], threshold?: number) => SkillMeta \| null` | Matches user intent to the best skill via Jaccard similarity on description tokens. |
| `activateSkill` | `(skill: SkillMeta) => SkillFull` | Loads the full SKILL.md body for the matched skill (Progressive Disclosure). |

The router is dependency-free (no runtime npm packages) and can be run directly:
```bash
ts-node src/agent/index.ts "create a new API endpoint"
```

Dev toolchain (`@types/node`, `prettier`, `typescript`) is installed via `npm install` — see `docs/adr/0003-npm-typescript-dev-toolchain.md`.

---

## Last Updated

2026-04-20 — E2E validation confirmed: regex-first requires: extraction (ADR 0010) fixes YAML-unsafe description bug; 7 unique SHAs across 70 repos prove per-repo suffix matching works including deep monorepo paths

# ADR 0002 — Adopt Claude Skills Plugin Architecture for Enterprise Workflows

**Status**: Accepted
**Date**: 2026-04-15
**Deciders**: claude-sonnet-4-6 (autonomous agent)

---

## Context

Following the initial documentation-enforcement infrastructure (ADR 0001), this repository now requires
a concrete implementation of the agent-side tooling that the enforcement system was designed to govern.

The strategic framework document *"Implementing Claude Skills for Enterprise Software Engineering"*
identifies a critical gap: while the repository enforces that documentation stays in sync with code,
the agent itself has no standardized, version-controlled procedures for *how* to perform common
engineering tasks (commits, migrations, scaffolding, refactoring).

Without encoded procedures, each agent session must rediscover best practices via ad-hoc prompting,
leading to:

- Inconsistent commit message formats across PRs
- Database migrations without valid rollback (`down()`) methods
- Feature boilerplate that deviates from the Clean Architecture standard
- Refactors that proceed without a baseline test run, risking silent regressions

The document proposes encapsulating these procedures into **Claude Skills** — structured SKILL.md files
with YAML frontmatter, stored in `.claude/plugins/`, and loaded on-demand by the agent via a
filesystem-based router (`src/agent/index.ts`).

This constitutes new infrastructure: it introduces 5 MCP server dependencies, a plugin management
system, and a TypeScript agent module that becomes part of the project's operative source.

---

## Decision

We adopt the **Claude Skills Plugin Architecture** as the standard procedure layer for all
engineering workflows in this repository.

### Implemented components

| Component | Path | Purpose |
|-----------|------|---------|
| Global CLI config | `.claude/settings.json` | Permission model (Read auto-approve, Write requires confirmation) |
| Plugin manifest | `.claude/plugins/engineering-std/.claude-plugin/plugin.json` | Declares skills and MCP server references |
| MCP configuration | `.claude/plugins/engineering-std/.mcp.json` | Bundles 5 MCP servers (see below) |
| git-commit skill | `skills/git-commit/SKILL.md` | Conventional Commits enforcement |
| db-migration skill | `skills/db-migration/SKILL.md` | TypeORM/PostgreSQL migration workflow |
| doc-standard skill | `skills/doc-standard/SKILL.md` | Style-guide enforcement on Markdown |
| doc-updater skill | `skills/doc-updater/SKILL.md` | Source ↔ docs drift detection (Phase 1 MVP) |
| scaffold-feature skill | `skills/scaffold-feature/SKILL.md` | Clean Architecture boilerplate generation (Phase 2) |
| safe-refactor skill | `skills/safe-refactor/SKILL.md` | Test-first refactor loop (Phase 3) |
| enterprise-feature-scaffold skill | `skills/enterprise-feature-scaffold/SKILL.md` | Appendix A reference implementation |
| Skills router | `src/agent/index.ts` | Discovery + Jaccard-similarity routing + activation |

### Essential MCP Servers

| Server | Package | Role |
|--------|---------|------|
| filesystem | `@modelcontextprotocol/server-filesystem` | Read/write/search local project files |
| github | `@modelcontextprotocol/server-github` | Issues, PRs, remote file access |
| postgres | `@modelcontextprotocol/server-postgres` | Schema inspection and migration verification |
| deep-research | `mcherukara/claude-deep-research` | Multi-step web research → ADR synthesis |
| memory | `chromadb/mcp-server` | Long-term semantic project memory (embeddings) |

**Alternatives considered and rejected:**

- **Inline system prompt**: Cannot be version-controlled, updated across the team, or subjected to code
  review. Rejected in favour of file-based Skills.
- **Hardcoded agent scripts**: Brittle, language-specific, not portable to other projects.
  Rejected in favour of the MCP open standard.
- **Fully autonomous agent (no HITL)**: Benchmark data shows autonomous agents produce higher rates
  of destructive operations in complex codebases. The `plan_mode_required` governance is mandatory
  for the `safe-refactor` skill. Rejected for production use without HITL.

---

## Consequences

**Positive:**
- Engineering procedures are version-controlled, reviewable, and distributable as a Git submodule.
- Context window efficiency: Progressive Disclosure loads only the active skill's body, reducing
  token overhead by ~40% vs. loading all instructions upfront.
- Standardization: all new features, commits, and migrations follow a single enforced procedure.
- The skills router (`src/agent/index.ts`) is covered by existing documentation-enforcement policies
  (CLAUDE.md updates required when `src/agent/` changes).

**Negative / Trade-offs:**
- MCP servers require Node.js (`npx`) to be available in the execution environment.
- The `chromadb/mcp-server` (long-term memory) requires a running ChromaDB instance; it is optional
  for initial deployment.
- `DATABASE_URL` and `GITHUB_TOKEN` environment variables must be configured per-developer;
  they must never be committed to the repository.

**Neutral:**
- The `safe-refactor` skill enforces a 3-attempt self-correction limit to prevent infinite loops;
  this may occasionally require manual intervention on complex refactors.

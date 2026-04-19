# project-life-107 — Documentation Policy-as-Code for Autonomous AI Agents

A reference implementation of a **4-layer documentation enforcement system** for repositories where
autonomous AI agents (such as Claude Code) are active contributors.

## The Problem

Autonomous agents read `CLAUDE.md`, `JOURNEY.md`, and ADRs as their operative memory. When code
changes but documentation does not, agents operate with stale context — a failure mode called
**Documentation Drift** — leading to policy violations, repeated architectural mistakes, and loss
of auditability.

## The Solution

Policy-as-Code (PaC) enforcement via OPA/Conftest as a **blocking CI gate** on every Pull Request.

| Layer | Artifact | Rule |
|-------|----------|------|
| 1 | `CLAUDE.md` | Must update when `src/agent/` changes |
| 2 | `docs/adr/*.md` | New ADR required for infra/dependency changes |
| 3 | `JOURNEY.md` | Must append session entry when `src/` changes |
| 4 | Artifacts | (Future) checksum validation against API definitions |

## Key Files

- [`CLAUDE.md`](CLAUDE.md) — Agent context and hard rules
- [`JOURNEY.md`](JOURNEY.md) — Append-only session journal
- [`docs/adr/`](docs/adr/) — Architecture Decision Records
- [`policy/`](policy/) — Rego enforcement policies
- [`scripts/generate_diff.sh`](scripts/generate_diff.sh) — Git diff → JSON bridge
- [`.github/workflows/documentation-enforcement.yml`](.github/workflows/documentation-enforcement.yml) — CI workflow

## Use as a Template

### Option A — Automated (bash script)

```bash
# From anywhere on your machine:
curl -fsSL https://raw.githubusercontent.com/edri2or/project-life-107/main/scripts/create-from-template.sh | \
  bash -s -- my-new-project

# Or clone first and run locally:
git clone https://github.com/edri2or/project-life-107.git
./project-life-107/scripts/create-from-template.sh my-new-project
```

The script clones the repo, replaces every `project-life-107` reference with your project name,
updates `.claude/template-source` for the next generation, and creates an initial commit.

### Option B — GitHub "Use this template" button

1. Go to the repo page on GitHub
2. Click **Use this template → Create a new repository**
3. After the new repo is created, open it in Claude Code and run:
   ```
   /cleanup-template
   ```
   Claude will auto-detect the template name from `.claude/template-source` and replace all references.

> **Note:** To enable the "Use this template" button, a repo admin must go to  
> **Settings → General → ☑ Template repository**.

---

## Setup

After cloning, enable the blocking gate in GitHub:
> **Settings → Branches → Branch protection rules → Require status checks →** add `doc-policy-check`

See [`docs/adr/0001-documentation-enforcement-setup.md`](docs/adr/0001-documentation-enforcement-setup.md)
for the full architectural rationale.
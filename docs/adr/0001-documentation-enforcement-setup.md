# ADR 0001 — Adopt Policy-as-Code for Documentation Enforcement

**Status**: Accepted
**Date**: 2026-04-15
**Deciders**: Initial project setup

---

## Context

In 2026, autonomous AI agents (such as Claude Code) operate directly inside repositories, reading
documentation files (`CLAUDE.md`, `JOURNEY.md`, ADRs) as their operative memory. When documentation
drifts from the actual code behaviour, agents make decisions based on stale context — a failure mode
called "Documentation Drift" — leading to:

- Agents violating policies they are unaware have changed
- Re-introduction of patterns previously rejected (lack of ADR memory)
- Loss of explainability and reproducibility for agent actions (no JOURNEY.md)

Manual enforcement of documentation updates is unreliable because:
1. It depends on human discipline in every PR
2. Automated agents opening PRs have no inherent motivation to update docs
3. Code review does not scale to catch all documentation gaps

The research document "אכיפת תיעוד וניהול מדיניות-כקוד במערכות סוכנים אוטונומיים (2026)" was
reviewed and provides the architectural basis for this decision.

---

## Decision

We adopt a **Policy-as-Code (PaC)** approach using **Open Policy Agent (OPA) / Conftest** to enforce
documentation invariants as a **blocking CI gate** on every Pull Request.

The architecture consists of four enforced layers:

| Layer | Artifact | Trigger |
|-------|----------|---------|
| 1 | `CLAUDE.md` | Changes under `src/agent/` |
| 2 | `docs/adr/*.md` | Changes to `package.json`, `terraform/`, `infra/` |
| 3 | `JOURNEY.md` | Any change under `src/` |
| 4 | Artifacts (future) | API definition or topology changes |

Policies are written in **Rego** (`policy/*.rego`), evaluated against a JSON manifest of changed
files produced by `scripts/generate_diff.sh`, and executed in `.github/workflows/documentation-enforcement.yml`.

**Alternatives considered and rejected:**

- **Kyverno**: Kubernetes-native; no native support for arbitrary Git file-change topologies. Rejected.
- **Manual review checklists**: Not enforceable for autonomous agent PRs. Rejected.
- **DangerJS only**: Provides warnings, not hard blocks. May be added as a complementary layer but
  cannot serve as the sole enforcement mechanism.

---

## Consequences

**Positive:**
- Merge is physically blocked when documentation invariants are violated
- Policy rules are versioned alongside code — auditable and reviewable
- Agents opening PRs must comply with the same rules as human developers
- The Rego policies act as machine-readable specifications of documentation requirements

**Negative / Trade-offs:**
- Developers must remember to update documentation files, or PRs will be blocked
- CI time increases slightly (Conftest evaluation is fast, < 5 seconds)
- Requires `doc-policy-check` to be configured as a Required Status Check in GitHub
  Branch Protection (one-time manual step)

**Neutral:**
- Future semantic validation (Qodo Merge / LLM-based checks) can be layered on top without
  changing this architectural decision

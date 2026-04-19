# Architecture Decision Records

This directory contains all Architecture Decision Records (ADRs) for `project-life-107`.

ADRs capture significant architectural decisions and their rationale. They are **immutable** once accepted —
to reverse or supersede a decision, create a new ADR that references the old one and mark the old one
as `Superseded`.

## Format

All ADRs follow the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):
- **Title** — short noun phrase
- **Status** — Proposed | Accepted | Deprecated | Superseded
- **Context** — the forces at play
- **Decision** — the change being proposed or made
- **Consequences** — the resulting context after the decision is applied

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-documentation-enforcement-setup.md) | Adopt Policy-as-Code for Documentation Enforcement | Accepted | 2026-04-15 |

## Creating a New ADR

1. Copy the template from any existing ADR
2. Number it sequentially (`NNNN-<kebab-case-title>.md`)
3. Set status to `Proposed`
4. Open a PR — the CI will verify the ADR exists when architectural changes are present
5. After team approval, change status to `Accepted`

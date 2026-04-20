# ADR 0014 — Jest Test Suite and workflow_dispatch for distribute-skills

**Date:** 2026-04-20  
**Status:** Accepted

## Context

Two related changes were made in the same PR:

1. **No test coverage** — `src/agent/index.ts` (the skills router) had zero tests. Routing logic (`routeIntent` Jaccard similarity) had a silent correctness issue discovered only during test authoring: "commit my code changes" routes to `doc-updater`, not `git-commit`, because "code" + "changes" tokens dominate. Without tests this class of regression is invisible.

2. **No manual trigger for skill distribution** — `distribute-skills.yml` only fired on `push` to `main` when an `exported-skills/*/SKILL.md` changed. Enrolling a new repo via `/push-skills` delivers skills without adaptation (no `build_resolution_map`). To force full re-adaptation on an existing enrolled repo, the only option was to touch a file in `exported-skills/` — there was no direct trigger.

## Decision

### Jest test suite

Add `jest`, `@types/jest`, and `ts-jest` as dev dependencies. Add `tsconfig.test.json` extending the base config with `"types": ["node", "jest"]` and `"rootDir": "."` to include `tests/` alongside `src/`.

Two test files:
- `tests/unit/agent.test.ts` (24 tests) — unit + integration tests for `discoverSkills`, `routeIntent`, `activateSkill`
- `tests/e2e/distribute-workflow-dispatch.test.ts` (20 tests) — local YAML content assertions and live GitHub API dispatch tests using `PUSH_TARGET_TOKEN`

Runtime code remains dependency-free. Jest is dev-only.

### workflow_dispatch trigger

Add `workflow_dispatch` to `distribute-skills.yml` with two optional inputs:

| Input | Blank means |
|-------|-------------|
| `skills` | All skills in `exported-skills/` |
| `target_repo` | All enrolled repos |

The `self-install` job is guarded with `if: github.event_name == 'push'` to prevent it from opening ~44 PRs on manual runs. The `detect` step branches on `github.event_name`: for `workflow_dispatch` with blank `skills`, it iterates `exported-skills/*/` filtering directories that contain a `SKILL.md`; for `push` it uses `git diff` as before.

`fetch-depth` is conditional: `2` for push (needs `HEAD~1` for diff), `1` for `workflow_dispatch` (no diff needed).

## Consequences

- `npm test` runs all 44 tests; `npm run test:unit` and `npm run test:e2e` run subsets
- Regression in routing intent correctness is now detectable before merge
- Newly enrolled repos can receive full adapted distribution immediately:
  ```
  Actions → Distribute Skills to Enrolled Repos → Run workflow
  skills:      (blank)
  target_repo: owner/new-repo
  ```
- `PUSH_TARGET_TOKEN` must be set in the session environment for e2e tests to pass

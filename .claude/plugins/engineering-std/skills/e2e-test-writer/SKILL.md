---
name: e2e-test-writer
description: "Investigates a process or flow, detects the repo's test framework, plans an E2E test covering happy path, failure paths, and edge cases, then writes the test after user approval. Use when asked to write or create an E2E test for any flow."
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
maturity: experimental
source-experiment: core
evidence: "First use 2026-04-20."
---

# E2E Test Writer

## Role
You are a Senior QA Architect who investigates processes end-to-end, detects the repo's test
framework, and produces a comprehensive test plan — then writes the test file only after
explicit user approval.

## Instructions

### Step 0: Detect Stack (mandatory first step)

Glob for framework manifest files and extract the framework name and version in one pass:

- `**/package.json` → look for: `playwright`, `cypress`, `jest`, `vitest`, `supertest`
- `**/requirements*.txt` or `**/pyproject.toml` → look for: `pytest`, `selenium`, `httpx`
- `**/Gemfile` → look for: `rspec`, `capybara`
- `**/go.mod` → look for: `testing`, `testify`

**Decision:**
- Exactly one framework found → state it clearly, proceed to Step 1
- Multiple frameworks found → list them and ask: "Which framework should the E2E test use?"
- No framework found → stop: "No test framework detected. Please install one before proceeding."

### Step 1: Investigate the Flow

With the framework confirmed, trace the target process in two groups:

**Structural (one Grep/Glob pass over source):**
1. **Entry point** — where the flow starts (API route, CLI command, UI trigger, event emitter)
2. **Hops** — every step: services called, DBs queried, external APIs hit, queues touched
3. **Exit condition** — the definitive success signal (HTTP 200, file written, event emitted, UI state)

**Fixture (separate lookup in test/fixture directories):**
4. **Test data** — what must exist before the flow runs (seed data, env vars, auth tokens)
5. **Teardown** — what must be cleaned up after (created records, temp files, side effects)

Carry all five findings forward into Step 3 without re-reading the same files — do not re-discover in the plan step what was found here.

Static guessing produces false assertions — always trace through source files.

### Step 2: Identify Test Cases

Apply a relevance filter first: skip any category that cannot occur given the detected framework and flow type (note "N/A — [reason]" for each skipped case). For applicable cases, map at minimum:

| Case | Description |
|------|-------------|
| Happy path | Full flow from entry to exit with valid data |
| Auth/permission failure | Unauthorised call returns expected error |
| Invalid input | Malformed or missing required data |
| External dependency failure | Downstream service returns error or timeout |
| Idempotency | Running the same operation twice produces consistent state |
| Edge case | Boundary value or unusual-but-valid scenario specific to this flow |

### Step 3: Build the Plan and Present for Approval

Using findings carried from Steps 1–2, output to chat in this exact format:

```
## E2E Test Plan — [Flow Name]

**Framework:** [detected framework + version]
**Test file location:** [proposed path]

### Test Data Setup
[What will be seeded/created before tests run — from Step 1 fixture findings]

### Teardown
[What will be cleaned up after — from Step 1 fixture findings]

### Async / Timing Strategy
[How waits will be handled — e.g. "await expect(locator).toBeVisible()" not hardcoded sleep]

### Test Cases
1. [Happy path] — [one-line description of assertions]
2. [Auth failure] — [expected status/message]  (or N/A — [reason])
3. [Invalid input] — [expected error]           (or N/A — [reason])
4. [Dependency failure] — [mock/stub strategy]  (or N/A — [reason])
5. [Idempotency] — [what is checked]            (or N/A — [reason])
6. [Edge case] — [description]

### Selector / Contract Risk
[Note any brittle selectors or API contracts that could cause drift — propose stable alternatives]

Shall I write this test file?
```

**Stop here.** If the user says "yes" → proceed to Step 4.
If the user requests changes → revise the plan, re-present in the same format, and wait for confirmation again before proceeding.

### Step 4: Write the Test File

Using the approved plan from Step 3 as the sole source of truth:

1. Write the test file to the path confirmed in the plan (Write for new file, Edit for existing).
2. Use the framework's idiomatic patterns — no generic boilerplate.
3. Every case identified in Step 2 and listed in the plan must appear — no silent omissions.
4. Confirm in chat: "Test file written to [path]. [N] test cases: [comma-separated list of case names]."

## Safety Rules

1. **NEVER write any test code before the user explicitly approves the plan in Step 3.**
2. **Framework must be confirmed before Step 1 begins** — unconfirmed or ambiguous framework is a hard stop.
3. **NEVER run tests** — this skill writes only. Execution is the user's responsibility.
4. **NEVER generate mocks for external dependencies** without noting them explicitly in the plan — silent mocking hides real integration failures.
5. **NEVER write tests that share mutable state** between test cases — each test must be independently runnable.

## Examples

**User:** "כתוב בדיקת e2e לתהליך ה-skill-contribute pipeline"

**Agent behaviour:**
Step 0: Globs for package.json — finds `"@playwright/test": "^1.42"` → framework: Playwright.
Step 1 structural: reads `.github/workflows/skill-contribute.yml`, traces flow — push to enrolled repo → templatizer runs → `sync/` branch created in ripo-skills-main → PR opened. Entry: git push event. Exit: PR opened with correct title.
Step 1 fixture: no seed data needed; teardown: delete created branch and PR.
Step 2: Auth failure N/A (no auth on push event); all other cases applicable.
Step 3: presents plan with Test Data Setup, Teardown, Timing Strategy, and 5 test cases including "PR auto-merge skipped when branch prefix ≠ sync/" as edge case. Waits for approval.
After approval: writes `tests/e2e/skill-contribute.test.ts` with 5 independent Playwright API tests.

**User:** "write an e2e test for the login flow"

**Agent behaviour:**
Step 0: finds both `cypress` and `jest` in package.json → asks "Both Cypress and Jest are installed. Which framework should the E2E login test use?" Waits for user choice before proceeding.

**User (after seeing plan):** "yes but change test case 3 to also cover expired tokens"

**Agent behaviour:**
Revises test case 3 in the plan to include expired-token scenario, re-presents the full updated plan, and waits for a clean "yes" before writing any file.

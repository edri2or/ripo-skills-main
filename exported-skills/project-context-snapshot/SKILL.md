---
name: project-context-snapshot
description: "Generates a project status snapshot: reads the session journal, product spec, and deployment service — useful before planning sessions or context handoffs."
allowed-tools: Read, Bash
source-experiment: core
scope: global
portability: 35
synthesis-required: true
source-repo: edri2or/project-life-130
blocked-refs:
  - PRODUCT.md
  - JOURNEY.md
  - Railway
  - Supabase
  - /project-context-snapshot
---

# project-context-snapshot

Generate a quick status snapshot before a planning session or agent handoff.

## When to use

Run `/project-context-snapshot` at the start of a new session to orient quickly.

## Steps

1. **Journal** — read [your-journey-file], extract the latest entry: date, objective, open items
2. **Product** — read [your-product-file] for current version and active features list
3. **Deploy** — check [your-railway] dashboard or run `curl <health-endpoint>` for live status
4. **Database** — query [your-supabase] to confirm no pending migrations or broken connections
5. **Summarize** — output:

```
Session: <date>
Last objective: <one line>
Version: <x.y.z>
Open items: <count>
Deploy: OK | DEGRADED | DOWN
DB: OK | PENDING_MIGRATION | ERROR
```

## Rules

- Read-only: never write to [your-journey-file], [your-product-file], or any config
- If a file is missing, mark that section as `N/A` and continue
- Summary must fit in 10 lines

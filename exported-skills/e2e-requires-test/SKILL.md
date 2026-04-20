---
name: e2e-requires-test
description: End-to-end test skill for manifest-driven requires: block resolution. Verifies custom placeholders are resolved per-repo via suffix matching.
source-experiment: core
requires:
  "[your-env-file]":
    - .env.example
    - .env.template
    - .env.sample
  "[your-docker]":
    - docker-compose.yml
    - docker-compose.yaml
    - Dockerfile
  "[your-next-config]":
    - next.config.js
    - next.config.ts
    - next.config.mjs
scope: global
portability: 100
synthesis-required: false
---

# e2e-requires-test

**This skill is a pipeline test — safe to delete after verification.**

Verifies that `requires:` block placeholder resolution works end-to-end
across all enrolled repos. Each repo should receive different resolved values
based on which files actually exist in its tree.

## Resolved values in this repo

- Env config: [your-env-file]
- Docker: [your-docker]
- Next.js: [your-next-config]

## Expected behaviour

| Placeholder | Resolved if repo has... | Stays literal if... |
|-------------|------------------------|---------------------|
| `[your-env-file]` | `.env.example`, `.env.template`, `.env.sample` | none of those exist |
| `[your-docker]` | `docker-compose.yml`, `Dockerfile` | no Docker files |
| `[your-next-config]` | `next.config.js/ts/mjs` | not a Next.js project |

Repos with all three resolved will show unique SHA vs repos with zero resolved.

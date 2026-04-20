---
name: e2e-requires-test
description: End-to-end test skill for manifest-driven requires: block resolution. Each enrolled repo receives different content based on its actual file tree.
allowed-tools: Read, Bash, Glob, Grep
source-experiment: core
requires:
  "[your-policy-config]":
    - policy/journey.rego
    - policy/main.rego
    - policies.rego
  "[your-docker-file]":
    - Dockerfile
    - docker-compose.yml
    - docker-compose.yaml
  "[your-deploy-config]":
    - railway.json
    - vercel.json
    - fly.toml
scope: global
portability: 100
synthesis-required: false
source-repo: edri2or/project-life-130
---

# e2e-requires-test

**Pipeline test skill — safe to delete after verification.**

Verifies `requires:` block placeholder resolution end-to-end across enrolled repos.
None of these placeholders exist in the 10 global HEURISTICS — they resolve ONLY via this manifest.

## Resolved values in this repo

- Policy config: [your-policy-config]
- Docker: [your-docker-file]
- Deploy config: [your-deploy-config]

Different SHA per repo = adaptation confirmed.

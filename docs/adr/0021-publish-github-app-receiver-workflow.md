# ADR-0021: publish-github-app-receiver workflow

**Date:** 2026-05-07
**Status:** Accepted

## Context

The `create-github-app` skill deploys a temporary Cloud Run receiver to facilitate GitHub App manifest registration. The receiver is a Python stdlib HTTP server packaged as a Docker image. To make the skill self-contained and portable across enrolled repos, the image must be published to a registry (`ghcr.io/edri2or/ripo-skills-main/github-app-receiver`) from this repository.

## Decision

Add `.github/workflows/publish-github-app-receiver.yml` that:
- Triggers on push to `receiver/**` paths and on `workflow_dispatch`
- Builds and pushes the image to GHCR using `GITHUB_TOKEN` (no external secrets)
- Sets package visibility to `public` so enrolled repos can pull without auth

## Consequences

- The image is rebuilt on every change to the receiver source
- Any repo using `create-github-app` depends on `ghcr.io/edri2or/ripo-skills-main/github-app-receiver:latest` being available
- Image is pinned to `latest` — callers cannot pin to a digest without changes to the skill workflow template

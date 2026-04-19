# ADR 0003 — Add npm TypeScript Dev Toolchain

**Date:** 2026-04-19  
**Status:** Accepted

## Context

The repository contains TypeScript source code (`src/agent/index.ts`) but had no `package.json` or `tsconfig.json`. Running `ts-node` or `tsc` on the file failed due to missing `@types/node` type definitions and absent compiler configuration.

A session-start hook was introduced (`.claude/hooks/session-start.sh`) to bootstrap the development environment in Claude Code on the web sessions. The hook requires `npm install` to install dev dependencies.

## Decision

Add:
- `package.json` with `@types/node`, `prettier`, and `typescript` as dev dependencies
- `tsconfig.json` with `CommonJS` module resolution, `strict` mode, and `@types/node` included

Runtime code remains dependency-free. Only dev tooling is added.

## Consequences

- `npm install` must be run once before type-checking or formatting
- `npm run typecheck` runs `tsc --noEmit` for type safety validation
- `npm run lint` runs `prettier --check src/` for formatting validation
- The session-start hook installs these dev dependencies automatically in remote sessions

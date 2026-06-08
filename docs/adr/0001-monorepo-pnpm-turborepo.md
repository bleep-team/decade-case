# 0001 — Monorepo on pnpm + Turborepo

**Status:** Accepted
**Date:** 2026-06-05

## Context

The system has a clear separation between pure domain logic (matching), data
access, a jobs runtime, an MCP surface, and a web app. These benefit from being
independent packages with their own tests and boundaries, while sharing config.

## Decision

Use a **pnpm workspace** (`apps/*`, `packages/*`) orchestrated by **Turborepo**.
Shared `@decade/typescript-config` and `@decade/eslint-config` packages hold the
common config; `turbo.json` defines the `build → typecheck → test → lint`
pipeline with `^build` dependencies so internal packages build in order.

## Consequences

- The pure `@decade/matching-engine` can be tested and reasoned about in
  isolation, with no framework or database in scope.
- One install, cached task graph, and `--filter='...[origin/main]'` for
  affected-only checks in CI and the pre-push hook.
- Slightly more ceremony per package (package.json, tsconfig, tsup) — mitigated by
  the new-package checklist, kept in `.claude/rules/monorepo.md` (mirrored for
  Cursor at `.cursor/rules/new-package.mdc`).

# CI/CD Pipeline

How code gets from a commit to production. This is the conceptual reference; for
first-time setup of Vercel / Neon / Clerk / Inngest, see the
[deploy runbook](../runbooks/deploy.md).

## Overview

The pipeline is integration-first: **Vercel** hosts the app, and its
first-party integrations carry the rest — the **Neon** integration gives each
preview its own database branch (production uses the main branch), and the
**Inngest** integration registers the functions on each deploy, for both previews
and production. GitHub Actions fills
the two gaps it leaves: running PR checks and applying production database
migrations.

- **PR pipeline** — fast feedback on every pull request (`ci.yml`) plus an
  automatic Vercel preview deployment.
- **Production pipeline** — on merge to `main`, Vercel builds and deploys the app
  while `deploy.yml` applies migrations and seeds reference data.

## Local quality gates (git hooks)

Husky hooks (auto-installed on `pnpm install`) catch most issues before CI:

| Hook         | When         | What runs                                                                                   |
| ------------ | ------------ | ------------------------------------------------------------------------------------------- |
| `pre-commit` | `git commit` | lint-staged — ESLint `--fix` + Prettier on staged files                                     |
| `commit-msg` | `git commit` | commitlint — Conventional Commits (`scope-enum` in `commitlint.config.js`)                  |
| `pre-push`   | `git push`   | `turbo run typecheck --filter='...[origin/main]'` — typecheck packages changed since `main` |

Hooks are a fast local convenience; CI remains the authoritative gate. Do not
bypass them with `--no-verify` to land code — fix the issue instead.

## PR pipeline

### Checks — `.github/workflows/ci.yml`

Runs on every pull request to `main` (with `concurrency` cancelling superseded
runs). The job spins up a `postgres:16-alpine` service and runs, in order:

1. **Install** — `pnpm install --frozen-lockfile` (Node 20, pnpm cache).
2. **Migrate** — `pnpm --filter @decade/db db:migrate` against the service
   Postgres, so the DB-backed integration test has a real schema.
3. **Lint** — `pnpm lint` (ESLint, all packages).
4. **Typecheck** — `pnpm typecheck` (`tsc --noEmit`).
5. **Test** — `pnpm test` (Vitest). Most suites use the in-process pglite
   harness; `@decade/exchange-runtime`'s integration test runs against the
   service Postgres because `TEST_DATABASE_URL` is set.
6. **Build** — `pnpm build` (Turborepo).

Build-time env is provided by the workflow: placeholder Clerk keys (`next build`
inlines `NEXT_PUBLIC_*` at build time) and `DATABASE_URL` / `TEST_DATABASE_URL`
pointing at the service Postgres. Turborepo caches task outputs, so unchanged
packages are not rebuilt within a run.

### Preview environment

Every PR gets its own **fully-isolated, disposable** preview, wired up entirely
by Vercel integrations — no Actions config needed:

- **Vercel** auto-deploys a preview build (the "Vercel" check links to it).
- The **Neon Vercel integration** creates a **database branch for that preview**,
  so a PR never reads or writes dev or production data; the branch is cleaned up
  when the PR closes.
- The **Inngest Vercel integration** registers the functions against the preview
  deployment, so matching, expiry, webhooks, and the market-maker all run on the
  preview just as in production.

Auth on previews uses a Clerk **development** instance (its placeholder banner and
rate limits are expected).

## Production pipeline

### Vercel project

A single Vercel project builds `apps/web` and serves
**https://decade.usebleep.com**, watching `main`. Because the app depends on
workspace packages, the build command is `cd ../.. && pnpm turbo run build
--filter=web` so `^build` builds them first. Production env vars (Neon pooled +
unpooled URLs, real Clerk keys, the `NEXT_PUBLIC_CLERK_*` routing URLs,
`NEXT_PUBLIC_APP_URL`) are listed in the [deploy runbook](../runbooks/deploy.md).

### What happens on merge to `main`

```
Push to main
    │
    ├─── Vercel GitHub Integration
    │      Builds apps/web (turbo --filter=web) and deploys to production.
    │
    ├─── Inngest Vercel Integration
    │      Re-syncs /api/inngest on each deploy, registering match-order,
    │      expire-orders, deliver-webhook, and the market-maker functions.
    │
    ├─── Neon (no action)
    │      The app points at the production branch; preview branches are
    │      cleaned up on their own.
    │
    └─── GitHub Actions — deploy.yml
           detect-changes: did packages/db/** change?
             └─ if yes → migrate-db job:
                  pnpm --filter @decade/db db:migrate && db:seed
                  (DATABASE_URL = Neon unpooled secret)
```

Migrations live **only** in `deploy.yml` (gated on `packages/db/**` changes), not
in the Vercel build — the app build never touches the database. Drizzle's
`migrate()` is idempotent (it checks the journal table), and `db:seed` is an
upsert, so a re-run is safe. Migration `0001` seeds the reference stocks, so any
freshly-migrated Neon branch is immediately tradeable.

> If orders submit in production but never match (they stay `open`), the Inngest
> app likely is not synced — see the sync-troubleshooting note in the
> [deploy runbook](../runbooks/deploy.md#4-inngest).

## Branch protection

`main` is protected on GitHub: PRs require the `ci.yml` checks to pass and a
review, branches must be up to date before merging, and direct pushes are
disallowed. (A merge blocked by "the base branch policy prohibits the merge" is
this protection; an admin can override for trusted changes.)

## Workflow files

```
.github/workflows/
  ci.yml       # PR — install, migrate, lint, typecheck, test, build (Postgres service)
  deploy.yml   # Merge to main — DB migrations + seed when packages/db changes
```

The actions are pinned to Node-24 majors (`checkout@v5`, `setup-node@v5`,
`pnpm/action-setup@v6`, `dorny/paths-filter@v4`).

## Platform integrations

| Platform                   | What it does                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| Vercel GitHub Integration  | Deploys `apps/web` on every push (preview + production)                      |
| Neon Vercel Integration    | A database branch per preview deployment; the production branch for `main`   |
| Inngest Vercel Integration | Registers the Inngest functions on each Vercel deploy (preview + production) |

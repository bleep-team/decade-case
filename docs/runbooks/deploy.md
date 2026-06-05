# Runbook — Deploy to production (Vercel + Neon + Clerk + Inngest)

Target: **https://decade.usebleep.com**. The app deploys via Vercel's GitHub
integration; migrations run from a GitHub Action; Inngest syncs via its Vercel
integration.

## 0. Prerequisites

- GitHub repo: `bleep-team/decade-case` (already the `origin` remote).
- Neon project (pooled + unpooled connection strings).
- Clerk app (for a custom domain, use a **production** instance; a dev instance
  works for previews but shows a dev banner and is rate-limited).
- Inngest account.

## 1. Push to the production branch

Vercel deploys the **Production Branch** (`main`) on push. Merge the scaffold
branch into `main` (PR or fast-forward), or set Vercel's production branch to the
working branch for the first deploy.

## 2. Vercel project

Import `bleep-team/decade-case`, then:

| Setting          | Value                                           |
| ---------------- | ----------------------------------------------- |
| Framework Preset | Next.js                                         |
| Root Directory   | `apps/web`                                      |
| Install Command  | _(default — pnpm installs the whole workspace)_ |
| Build Command    | `cd ../.. && pnpm turbo run build --filter=web` |
| Output Directory | `.next` _(default)_                             |

The build-command override is required because `apps/web` depends on workspace
packages that must be built first; `turbo run build --filter=web` builds them in
order via the `^build` dependency.

### Environment variables (Production)

| Key                                               | Value                                         |
| ------------------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`                                    | Neon **pooled** (`-pooler`) connection string |
| `DATABASE_URL_UNPOOLED`                           | Neon **direct** connection string             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Clerk publishable key                         |
| `CLERK_SECRET_KEY`                                | Clerk secret key                              |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                   | `/sign-in`                                    |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                   | `/sign-up`                                    |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/app`                                        |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/app`                                        |
| `NEXT_PUBLIC_APP_URL`                             | `https://decade.usebleep.com`                 |

(`INNGEST_*` keys are set automatically by the Inngest Vercel integration — step 4.)

## 3. Database migrations

Migrations run from `.github/workflows/deploy.yml` on push to `main` when
`packages/db/**` changes. Add a GitHub repo secret:

- `DATABASE_URL` = Neon **unpooled** connection string (DDL wants a direct session).

Then seed reference data once (locally or via a one-off):

```bash
DATABASE_URL=<unpooled> pnpm --filter @decade/db db:seed       # stocks
# optional demo brokers: pnpm --filter @decade/db db:seed-dev
```

## 4. Inngest

Install the **Inngest Vercel integration** and link the project. It sets
`INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel and auto-syncs the app at
`https://decade.usebleep.com/api/inngest` on each deploy, registering the
`match-order`, `expire-orders`, and `deliver-webhook` functions.

## 5. Clerk

- Add `decade.usebleep.com` to the Clerk instance's allowed domains.
- Enable Google + GitHub under Social Connections.
- For the custom domain, promote to a Clerk production instance and use its keys.

## 6. Domain

Point `decade.usebleep.com` at the Vercel project (CNAME / Vercel DNS).

## 7. Post-deploy smoke test

```bash
BASE=https://decade.usebleep.com
curl -s $BASE/api/health                      # {"status":"ok","db":"up"}
# submit a crossing pair (use a real broker id), then:
curl -s $BASE/api/stocks/AAPL/price
curl -s $BASE/api/brokers/<brokerId>/balance
```

Expect the order to reach `filled`, the price to reflect the seller's price, and
balances to move — the same flow verified locally against Neon.

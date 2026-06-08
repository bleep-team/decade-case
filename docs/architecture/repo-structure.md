# Repo Structure

## Full Directory Layout

```
decade/
├── apps/
│   └── web/                      # Next.js (App Router) — landing, Clerk auth, broker dashboard,
│       ├── src/
│       │   ├── app/              #   REST API (/api/orders, /api/trades, /api/stocks, /api/brokers,
│       │   │                     #   /api/webhooks, /api/demo/reset, /api/health), Inngest (/api/inngest),
│       │   │                     #   MCP (/api/mcp), and the .well-known/oauth-* discovery routes
│       │   ├── components/       #   App-specific React components (dashboard, terminal, charts)
│       │   ├── lib/              #   Shared server logic: exchange-service, broker-identity, validation
│       │   └── middleware.ts     #   clerkMiddleware — guards /app(.*)
│       ├── next.config.ts        #   transpilePackages: ['@decade/ui']
│       └── vitest.config.ts
│
├── packages/
│   ├── typescript-config/        # Shared tsconfig bases (base, react, library) — config only, no runtime
│   ├── eslint-config/            # Shared ESLint flat config (base, nextjs) — config only, no runtime
│   ├── types/                    # Domain primitives: Order, Trade, Cents, OrderBook + money helpers
│   ├── logger/                   # Structured JSON logging with bound context; console transport
│   ├── matching-engine/          # PURE price-time matching, partial fills, order book, price calc
│   ├── db/                       # Drizzle schema + migrations + pg-backed client; pglite test harness
│   ├── auth/                     # Clerk helpers, broker identity, API keys
│   ├── ui/                       # shadcn/ui design system (Tailwind v4, single dark theme) — NOT built
│   ├── exchange-runtime/         # Inngest functions, persistence (transaction), realtime, webhooks
│   └── mcp/                      # MCP server exposing the exchange as tools (transport-only)
│
├── docs/                         # Documentation, organized by purpose
│   ├── README.md                 # Landing page when browsing docs/
│   ├── architecture/             # System design
│   │   ├── overview.md           #   The order lifecycle, module map, data model
│   │   ├── stack.md              #   Technology choices + ADR rationale
│   │   ├── repo-structure.md     #   This file
│   │   └── package-guide.md      #   Per-package responsibilities and exports
│   ├── adr/                      # Architecture Decision Records
│   │   ├── README.md
│   │   └── 0001…0007-*.md        #   monorepo, db, auth, jobs, engine, ui, mcp
│   └── runbooks/                 # Operational runbooks
│       └── deploy.md
│
├── .github/
│   └── workflows/                # CI checks + deploy
│
├── .agents/                      # Coding agent skills (universal); .claude/ symlinks into here
├── .claude/                      # Claude Code config (rules, skills)
├── .cursor/                      # Cursor config (rules)
│
├── CLAUDE.md                     # Claude Code instructions
├── AGENTS.md                     # Codex instructions
├── UBIQUITOUS_LANGUAGE.md        # Domain terminology glossary
├── .mcp.json                     # Dev MCP servers (context7, playwright)
├── Dockerfile                    # Reproducible web + Inngest image
├── docker-compose.yml            # Full local stack (Postgres + migrate/seed + web + Inngest)
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json                    # Turborepo pipeline config
├── tsconfig.json                 # Root TypeScript config
├── eslint.config.js              # Root ESLint config
├── .prettierrc                   # Prettier config
├── commitlint.config.js          # Commit message validation (scope-enum)
├── .lintstagedrc.js              # Staged-file lint config
├── skills-lock.json              # Skills version lock
└── README.md
```

## Workspace Configuration

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Adding a directory under `apps/` or `packages/` and running `pnpm install`
auto-detects it as a workspace package. When adding a package, also add its
directory name to `scope-enum` in `commitlint.config.js`.

### Package Naming

Every package uses the `@decade/<directory-name>` namespace:

| Directory                   | Package Name               |
| --------------------------- | -------------------------- |
| `packages/matching-engine`  | `@decade/matching-engine`  |
| `packages/db`               | `@decade/db`               |
| `packages/ui`               | `@decade/ui`               |
| `packages/exchange-runtime` | `@decade/exchange-runtime` |
| ...                         | `@decade/<directory-name>` |

The web app (`apps/web`) is the single exception — it is named `web`, not
`@decade/web`.

## Cross-Package Imports

Always import across package boundaries by **package name**, never by relative
path:

```typescript
// Correct
import { matchOrder } from '@decade/matching-engine'
import { createDbClient } from '@decade/db'

// Wrong — never cross a package boundary with a relative path
import { matchOrder } from '../../matching-engine/src/match'
```

### `.js` specifiers for built libraries

Internal libraries are built with **tsup to ESM**, so they import each other (and
their own modules) with explicit `.js` specifiers — the extension of the _built_
output, even though the source file is `.ts`:

```typescript
// Correct — inside a built @decade/* library (types, logger, matching-engine,
// db, auth, exchange-runtime, mcp)
export { matchOrder } from './match.js'
import { toDomainOrder } from './mappers.js'
```

```typescript
// Wrong — extensionless or .ts specifiers break the ESM output
export { matchOrder } from './match'
import { toDomainOrder } from './mappers.ts'
```

### Extensionless imports for `@decade/ui`

`@decade/ui` is the **one exception**. It is **not built** — it ships `.tsx`/`.ts`
source directly and is consumed via Next's `transpilePackages: ['@decade/ui']`.
Its internal imports are therefore **extensionless**, and consumers import its
components through the subpath `exports` map:

```typescript
// Correct — inside @decade/ui (extensionless)
import { cn } from '../lib/utils'

// Correct — a consumer importing from @decade/ui (subpath, no barrel)
import { Button } from '@decade/ui/components/button'
import { cn } from '@decade/ui/lib/utils'
```

```typescript
// Wrong — @decade/ui source must not use .js specifiers (it isn't built)
import { cn } from '../lib/utils.js'
```

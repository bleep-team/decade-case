# 0003 — Clerk for auth with social login

**Status:** Accepted

## Context

The product needs a public landing page and an authenticated broker dashboard,
with social login, on Next.js App Router, shipped quickly.

## Decision

Use **Clerk**. `clerkMiddleware` protects `/app(.*)`; the landing page, auth
pages, and the broker/MCP/Inngest APIs stay public. Social providers (Google,
GitHub) are toggled in the Clerk dashboard. Auth helpers live in `@decade/auth`.

Supabase Auth was the main alternative (it would consolidate auth + DB into one
vendor) but Clerk gives lower-friction social login and a cleaner App Router
integration, and keeping the database concern separate (ADR 0002) is fine here.

## Consequences

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is required at **build** time (it is inlined
  into the client bundle); CI and Docker pass placeholders, prod passes real keys.
- The broker REST API (`/api/orders`) is broker-identified by `brokerId` in the
  request, not by the dashboard session — broker API-key auth is a follow-up.

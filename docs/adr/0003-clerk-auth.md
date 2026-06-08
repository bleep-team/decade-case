# 0003 — Clerk for auth with social login

**Status:** Accepted
**Date:** 2026-06-05

## Context

The product needs a public landing page and an authenticated broker dashboard,
with social login, on Next.js App Router, shipped quickly.

## Decision

Use **Clerk**. `clerkMiddleware` protects `/app(.*)`; the landing page, auth
pages, and the Inngest API stay public. Social providers (Google, GitHub) are
toggled in the Clerk dashboard. Auth helpers live in `@decade/auth`. (The MCP
surface, originally left public here, is now authenticated — see ADR 0007.)

Supabase Auth was the main alternative (it would consolidate auth + DB into one
vendor) but Clerk gives lower-friction social login and a cleaner App Router
integration, and keeping the database concern separate (ADR 0002) is fine here.

## Consequences

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is required at **build** time (it is inlined
  into the client bundle); CI and Docker pass placeholders, prod passes real keys.
- The broker REST API (`/api/orders`) is broker-identified by the caller's
  verified identity, never by a `brokerId` in the request body. The identity is
  either the Clerk dashboard session (auto-provisioning a funded broker on first
  login) or a forwarded API key in `Authorization: Bearer` — resolved in one
  place by `apps/web/src/lib/broker-identity.ts`. Broker API keys shipped in
  `@decade/auth` (`generateApiKey`/`hashApiKey`/`verifyApiKey`,
  `resolveBrokerByApiKey`, `rotateApiKey`): only a key's SHA-256 hash is stored,
  and the same credential authenticates the MCP surface (ADR 0007).

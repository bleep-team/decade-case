# 0007 — MCP authenticated by Clerk OAuth, with an API-key bridge

**Status:** Accepted
**Date:** 2026-06-08

## Context

The exchange exposes its tools to LLM clients through an MCP server mounted at
`/api/mcp` (Streamable HTTP). Two kinds of caller need to reach it as a specific
broker:

- A **native connector** added by URL in Claude Desktop / claude.ai, where the
  human signs in interactively and the client speaks OAuth 2.1 (with Dynamic
  Client Registration) — no API key to paste.
- A **scripted client** (e.g. `mcp-remote`) that forwards a broker's API key as a
  bearer token, the same credential the REST API accepts (ADR 0003).

The acting broker must come from the caller's verified identity, never from a
tool argument, so one user can never act as another's broker. The original
`/api/mcp` surface was unauthenticated (ADR 0003 left "MCP APIs stay public"); the
native-connector flow forces the question of how to authenticate it without
hand-rolling an OAuth server.

## Decision

Authenticate `/api/mcp` with **Clerk OAuth as the primary path and the forwarded
API key as a fallback**, using Clerk's first-party MCP support rather than a
bespoke OAuth implementation.

- Add `@clerk/mcp-tools`. The handler is wrapped with `withMcpAuth` (from
  `mcp-handler`): a bearer is verified first as a **Clerk OAuth token**
  (`verifyClerkToken` + `auth({ acceptsToken: 'oauth_token' })`); if that fails it
  is treated as a **forwarded API key** and resolved by hash (`resolveBrokerByApiKey`).
  A call with no credential gets `401` plus an RFC 9728 `WWW-Authenticate` pointer.
- Publish the discovery metadata the connector reads: `/.well-known/oauth-authorization-server`
  (RFC 8414, `authServerMetadataHandlerClerk`) and `/.well-known/oauth-protected-resource/mcp`
  (RFC 9728, `protectedResourceHandlerClerk`), each with a CORS `OPTIONS`.
- Bridge identity to a broker in one place: an OAuth `userId` resolves via
  `resolveOrCreateBroker`; an API key via `resolveBrokerByApiKey`. Both converge on
  the **shared broker-scoped `exchange-service`** that the REST routes and the
  terminal server action also use, so all surfaces run identical logic with no HTTP
  round-trip. `@decade/mcp` itself is transport-only: tools distil the identity
  from `extra` (`identityFromExtra`) and dispatch to an injected `ExchangeToolBackend`.

Hand-rolling an OAuth authorization server, or restricting MCP to API keys only
(losing the click-to-add connector), were both rejected — Clerk already issues the
tokens for the app's social login, so reusing it keeps one identity provider.

## Consequences

- A native connector works end to end: add-by-URL → Clerk/Google sign-in → tools
  act as that user's broker. The API-key path keeps working for `mcp-remote`, so
  there is no regression for scripted clients.
- Two operational requirements on the Clerk instance, both human-only setup:
  enable **OAuth Applications** and **Dynamic Client Registration**, and verify
  against a **public HTTPS URL** (the OAuth redirect will not complete on bare
  `localhost`).
- Reverse proxies need care: the advertised resource and the CORS headers must
  reflect the _public_ origin the client reached, not the internal one. The
  protected-resource route rebuilds its URL from `x-forwarded-host`, and the
  transport sends CORS that exposes `WWW-Authenticate` so the client can read the
  401 pointer. (See the `forwarded-url` helper and the `/api/[transport]` route.)
- `get_broker_balance` and the other tools dropped their `brokerId` argument — the
  broker is the identity's, closing an "act as any broker" gap.
- The MCP tool descriptions and a server `instructions` string state plainly that
  Decade is a simulated, play-money venue, so an assistant's safety layer does not
  refuse `submit_order` as a real financial trade.

This supersedes ADR 0003's note that the MCP APIs stay public.

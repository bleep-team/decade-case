# 0004 — Inngest for jobs and per-symbol matching

**Status:** Accepted
**Date:** 2026-06-05

## Context

Matching should happen "as soon as matching orders can be found", respecting
chronological order, and must not double-execute under concurrent submissions.
There are also scheduled (order expiry) and fan-out (execution webhooks) needs.

## Decision

Use **Inngest**. Order submission emits `order/submitted`; the `match-order`
function consumes it with **`concurrency: { key: "event.data.symbol", limit: 1 }`**,
so at most one run touches a given symbol's book at a time. This single-writer
guarantee makes price-time priority and partial fills race-free **without
application-level locks**, while different symbols still match in parallel.

- `expire-orders` is a cron (`* * * * *`) that sweeps expired orders.
- `deliver-webhook` consumes `trade/executed` and delivers signed payloads with
  Inngest's built-in retries.
- A **market maker** posts fictional two-sided liquidity so a solo broker always
  has something to trade against. `market-maker` reacts to `order/submitted` and
  `market-maker-cron` (`* * * * *`) drifts each symbol's reference price and
  re-quotes its ladder. Mock quotes rest as `open` maker rows; the rare fresh
  quote that already crosses a resting order is routed through the real
  `match-order` matcher to clear the cross. The reactive function shares
  matching's per-symbol `concurrency: { key: symbol, limit: 1 }` so quoting and
  matching stay serialized on the same key.

Alternatives (Vercel Cron alone, QStash, Trigger.dev) were considered; Inngest's
keyed concurrency is a near-perfect fit for per-symbol serialization, and it runs
on Vercel with a local dev server for reproducible local runs.

## Consequences

- Correctness rests on the per-symbol concurrency key; the DB transaction makes
  each execution atomic as a second line of defense.
- Steps should become idempotent (idempotency keys) before high throughput. Still
  an open follow-up — no idempotency keys were added; correctness rests on the
  per-symbol key plus the atomic DB transaction.

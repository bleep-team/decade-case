# 0005 — A pure matching engine

**Status:** Accepted
**Date:** 2026-06-05

## Context

The matching logic is the core of the system and the part most worth getting
provably right: crossing, seller-price execution, partial fills, and price-time
priority.

## Decision

Implement matching as a **pure** package (`@decade/matching-engine`):
`matchOrder(incoming, restingBook)` returns proposed trades and updated order
states. It has **no database, no clock, and generates no ids** — the caller
excludes expired orders and assigns trade ids/timestamps at persistence time.

Resting orders are always limit orders (market orders never rest). Candidates are
sorted best-price-first then by `sequence`; matching stops at the first
non-crossing candidate. Execution price is the ask's limit price (the seller's
price); for a market taker it falls back to the resting order's price.

## Consequences

- The engine is exhaustively unit-testable — `match.test.ts` encodes every example
  from the brief (same price, no match, price gap, partial fills, chronological
  priority, market orders, symbol/side isolation, input immutability).
- The runtime (`persistMatchResult`) owns all side effects, keeping the boundary
  between "decide" and "persist" clean.
- Money-leg enforcement lives in the **runtime boundary**, not the engine. The
  buying-power check (rejecting an underfunded limit buy) is
  `packages/exchange-runtime/src/buying-power.ts`, applied in the shared
  `exchange-service` at submission time before an order ever reaches the book.
  Keeping cash checks out of the pure engine reinforces the purity boundary: the
  engine decides _crossing_, the runtime owns _funding_ and all balance writes.

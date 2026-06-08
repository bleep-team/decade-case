# @decade/exchange-runtime

The Inngest jobs layer and persistence for the exchange.

- `inngest` + `functions` — registered at the app's `/api/inngest`.
- `match-order` — consumes `order/submitted` with **per-symbol concurrency
  (`limit: 1`)**, runs `@decade/matching-engine`, persists via `persistMatchResult`,
  and emits `trade/executed`.
- `expire-orders` — cron sweeping past-`expiresAt` orders to `expired`.
- `deliver-webhook` — consumes `trade/executed`, delivers signed, retried payloads.
- `market-maker` — cron + on-demand quote generation that posts a fictional
  liquidity ladder around a drifting reference (`generateQuoteLadder`, `stepReference`),
  routing any quote that crosses the resting book through the real matcher.
- `persistMatchResult(db, result, now)` — writes trades, order updates, and broker
  balance moves in one transaction. `computeSettlementDeltas` derives the cash/position
  moves; `runMatch` / `executeMatch` drive a match end to end.
- `runCancel` — cancels a resting order through the same per-symbol writer as matching.
- `runDemoReset(db, brokerId, startingBalanceCents, now)` — backs `POST /api/demo/reset`:
  cancels the broker's open orders, clears its positions, and restores starting cash,
  keeping trade history.
- `availableBuyingPowerCents` / `hasBuyingPowerFor` — the cash-leg guard; an underfunded
  limit buy is recorded `rejected` and never emitted to matching.
- `brokerChannel` / `publishBrokerUpdate` / `deriveBrokerUpdates` / `publishSettlement` —
  Inngest Realtime push so the terminal updates live without polling.
- `buildWebhookPayload` / `signPayload` / `webhookHeaders` / `SIGNATURE_HEADER` — pure
  webhook helpers (HMAC-SHA256).
- `getDb()` — the `pg`-backed Drizzle client used across the runtime.

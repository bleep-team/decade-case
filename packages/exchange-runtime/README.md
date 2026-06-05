# @decade/exchange-runtime

The Inngest jobs layer and persistence for the exchange.

- `inngest` + `functions` — registered at the app's `/api/inngest`.
- `match-order` — consumes `order/submitted` with **per-symbol concurrency
  (`limit: 1`)**, runs `@decade/matching-engine`, persists via `persistMatchResult`,
  and emits `trade/executed`.
- `expire-orders` — cron sweeping past-`expiresAt` orders.
- `deliver-webhook` — consumes `trade/executed`, delivers signed, retried payloads.
- `persistMatchResult(db, result, now)` — writes trades, order updates, and broker
  balance moves in one transaction.
- `buildWebhookPayload` / `signPayload` — pure webhook helpers (HMAC-SHA256).

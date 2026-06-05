# @decade/matching-engine

Pure, deterministic price-time-priority matching for the Decade Exchange. No
database, no clock, no id generation — it decides, the runtime persists.

```ts
import { matchOrder, buildOrderBook, movingAverage } from '@decade/matching-engine'

const result = matchOrder(incomingOrder, restingBook)
// result.trades, result.takerOrder, result.filledRestingOrders
```

- `matchOrder(incoming, restingBook)` — match an order, returning proposed trades
  and updated order states (partial fills, seller-price execution, chronological
  priority).
- `buildOrderBook(symbol, orders, depth?)` — aggregate live orders into price levels.
- `bestBid` / `bestAsk` / `midpoint` — top-of-book metrics.
- `movingAverage(values, window?)` — for the current-price endpoint.

Every example from the engineering brief is covered in `src/match.test.ts`.

# Ubiquitous Language

Canonical terms for the Decade Exchange domain. Use these names in code, tests,
APIs, and docs.

| Term                  | Meaning                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Broker**            | A firm that submits orders on behalf of customers. Has a cash balance. Maps 1:1 to a Clerk user.                               |
| **Owner document**    | The document number of the customer who owns an order (the broker submits on their behalf).                                    |
| **Order**             | A request to trade: broker, owner document, symbol, **side**, **type**, price, quantity, validity. Identified by an `orderId`. |
| **Side**              | `bid` (buy) or `ask` (sell). A **bid** is the buyer's maximum price; an **ask** is the seller's minimum.                       |
| **Type**              | `limit` (carries a price) or `market` (best available price, never rests).                                                     |
| **Cross**             | A bid and ask are compatible to trade: `bid ≥ ask`.                                                                            |
| **Execution price**   | The price a trade settles at — always the **seller's (ask) price** when two limits cross.                                      |
| **Trade** (Execution) | A settled match between one bid and one ask: symbol, price, quantity, both order/broker ids, timestamp.                        |
| **Partial fill**      | A trade for less than an order's full quantity; the order keeps a non-zero `remaining`.                                        |
| **Remaining**         | Unfilled quantity still resting on the book.                                                                                   |
| **Sequence**          | A monotonic per-order counter; the chronological (price-time) priority tiebreaker.                                             |
| **Order book**        | The set of live (open/partially-filled) orders for a symbol, aggregated into price **levels**.                                 |
| **Status**            | `open` → `partially_filled` → `filled`, or `cancelled` / `expired` / `rejected`.                                               |
| **Cents**             | The unit of all money in the system — integer minor currency units. Never floats.                                              |
| **Symbol**            | A tradeable stock ticker (e.g. `AAPL`), backed by the `stocks` reference table.                                                |

## Status meanings

- `open` — resting on the book, no fills yet.
- `partially_filled` — some quantity filled, `remaining > 0`, still on the book.
- `filled` — fully matched, `remaining = 0`.
- `cancelled` — terminated before fully filling (e.g. a market order's unfilled remainder).
- `expired` — passed its `expiresAt` before filling; swept by the expiry cron.
- `rejected` — a limit buy whose cost exceeds the broker's available cash; recorded at submission and never sent to matching (the cash-leg guard, distinct from a user `cancelled`).

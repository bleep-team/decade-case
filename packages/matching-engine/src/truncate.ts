import type { Cents, Order } from '@decade/types'
import type { MatchResult, ProposedTrade } from './match.js'

/** Notional cost of `quantity` shares at `price` cents each (integer cents). */
function cost(price: Cents, quantity: number): Cents {
  return price * quantity
}

/**
 * Trim a buy-side match result to what the taker's cash can actually cover.
 *
 * The engine is balance-blind, so it may propose more fills than a market buyer
 * can pay for. This pure helper walks the proposed trades in chronological
 * order, spends the budget, and cuts the result at the point the cash runs out:
 *
 * - When the total cost is within `cashCents`, the result is returned unchanged.
 * - The boundary trade (the first one the budget cannot fully afford) is split
 *   to `floor(remainingBudget / price)` shares; its resting order's fill is
 *   adjusted to match and every later trade is dropped (its resting fill
 *   reverted with it).
 * - When not even one boundary share is affordable, the boundary trade is
 *   dropped whole (degrading to a clean "drop everything from here" cut).
 *
 * The taker's remainder is recomputed and marked `cancelled` — a budget cut is
 * a hard stop, never resting liquidity.
 *
 * `matchOrder` produces trades and `filledRestingOrders` as parallel arrays
 * (one resting order filled per trade, in lock-step), which this relies on.
 */
export function truncateToBudget(result: MatchResult, cashCents: Cents): MatchResult {
  const totalCost = result.trades.reduce((sum, trade) => sum + cost(trade.price, trade.quantity), 0)
  if (totalCost <= cashCents) return result

  const trades = result.trades
  const restingOrders = result.filledRestingOrders

  const keptTrades: ProposedTrade[] = []
  const keptRestingOrders: Order[] = []
  let spent = 0
  let filledQuantity = 0

  for (let i = 0; i < trades.length; i += 1) {
    const trade = trades[i]
    const restingOrder = restingOrders[i]
    if (trade === undefined || restingOrder === undefined) break

    const tradeCost = cost(trade.price, trade.quantity)
    if (spent + tradeCost <= cashCents) {
      keptTrades.push(trade)
      keptRestingOrders.push(restingOrder)
      spent += tradeCost
      filledQuantity += trade.quantity
      continue
    }

    // Boundary trade: spend whatever budget is left on whole shares.
    const remainingBudget = cashCents - spent
    const affordableShares = Math.floor(remainingBudget / trade.price)
    if (affordableShares >= 1) {
      keptTrades.push({ ...trade, quantity: affordableShares })
      keptRestingOrders.push(splitRestingFill(restingOrder, trade.quantity, affordableShares))
      filledQuantity += affordableShares
    }
    // Either way, nothing beyond the boundary survives.
    break
  }

  const remaining = result.takerOrder.quantity - filledQuantity
  const takerOrder: Order = {
    ...result.takerOrder,
    remaining,
    status: remaining === 0 ? 'filled' : 'cancelled',
  }

  return { trades: keptTrades, takerOrder, filledRestingOrders: keptRestingOrders }
}

/**
 * Re-derive a resting order's fill when its boundary trade shrinks from
 * `filledQuantity` shares to `affordableShares`. The order passed in already has
 * the full fill applied, so we reconstruct its pre-fill remaining first.
 */
function splitRestingFill(filled: Order, filledQuantity: number, affordableShares: number): Order {
  const preFillRemaining = filled.remaining + filledQuantity
  const remaining = preFillRemaining - affordableShares
  return {
    ...filled,
    remaining,
    status: remaining === 0 ? 'filled' : 'partially_filled',
  }
}

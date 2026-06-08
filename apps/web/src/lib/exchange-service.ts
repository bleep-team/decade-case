import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import {
  brokers,
  orders,
  positions,
  stocks,
  toDomainOrder,
  trades,
  type Broker,
  type Database,
} from '@decade/db'
import { buildOrderBook, midpoint, movingAverage } from '@decade/matching-engine'
import type { OrderBookSnapshot } from '@decade/types'
import { hasBuyingPowerFor, inngest } from '@decade/exchange-runtime'
import type { SubmitOrderBody } from '@/lib/validation'

/**
 * Broker-scoped exchange operations shared by the REST routes and the MCP tools,
 * so the two surfaces never drift apart. Each function takes the `db` and the
 * already-resolved acting broker (where relevant) and returns plain,
 * JSON-serializable data — the HTTP/MCP layers only adapt the result.
 *
 * The acting broker always comes from the caller's identity, never the payload.
 */

export interface CreateOrderResult {
  orderId: string
  status: 'open' | 'rejected'
}

/**
 * Insert an order under `broker` and hand it to the per-symbol matcher. A limit
 * buy beyond the broker's free cash is recorded `rejected` and never emitted —
 * the matcher's execution-time `truncate` backstops market buys and races.
 */
export async function createOrder(
  db: Database,
  broker: Broker,
  payload: SubmitOrderBody,
): Promise<CreateOrderResult> {
  const limitPriceCents = payload.type === 'market' ? null : (payload.limitPrice ?? null)

  const affordable = await hasBuyingPowerFor(db, broker, {
    side: payload.side,
    type: payload.type,
    limitPriceCents,
    quantity: payload.quantity,
  })

  const [inserted] = await db
    .insert(orders)
    .values({
      brokerId: broker.id,
      ownerDocument: payload.ownerDocument,
      symbol: payload.symbol,
      side: payload.side,
      type: payload.type,
      limitPriceCents,
      quantity: payload.quantity,
      remaining: payload.quantity,
      status: affordable ? 'open' : 'rejected',
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    })
    .returning({ id: orders.id })

  if (!inserted) {
    throw new Error('order insert failed')
  }

  if (affordable) {
    await inngest.send({
      name: 'order/submitted',
      data: { orderId: inserted.id, symbol: payload.symbol },
    })
  }

  return { orderId: inserted.id, status: affordable ? 'open' : 'rejected' }
}

export interface OrderView {
  orderId: string
  status: string
  symbol: string
  side: string
  type: string
  limitPriceCents: number | null
  quantity: number
  remaining: number
  createdAt: Date
  expiresAt: Date | null
}

/** Look up an order by id, or `null` when no such order exists. */
export async function getOrder(db: Database, orderId: string): Promise<OrderView | null> {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
  if (!row) {
    return null
  }
  return {
    orderId: row.id,
    status: row.status,
    symbol: row.symbol,
    side: row.side,
    type: row.type,
    limitPriceCents: row.limitPriceCents,
    quantity: row.quantity,
    remaining: row.remaining,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  }
}

/** Top of the book (best bids/asks) for a symbol, to `depth` levels per side. */
export async function getOrderBook(
  db: Database,
  symbol: string,
  depth = 10,
): Promise<OrderBookSnapshot> {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.symbol, symbol), inArray(orders.status, ['open', 'partially_filled'])))
  return buildOrderBook(symbol, rows.map(toDomainOrder), depth)
}

const PRICE_SAMPLE_SIZE = 20

export interface PriceView {
  symbol: string
  price: number | null
  source: 'midpoint' | 'last_trade_ma' | 'reference' | 'none'
}

/**
 * Current price for a symbol, per the case: the order-book midpoint (mean of the
 * best bid and ask). When the book is one-sided or empty there is no midpoint, so
 * it falls back to a moving average over recent trades, then the seeded reference.
 */
export async function getPrice(db: Database, symbol: string): Promise<PriceView> {
  const restingRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.symbol, symbol), inArray(orders.status, ['open', 'partially_filled'])))
  const book = buildOrderBook(symbol, restingRows.map(toDomainOrder))
  const mid = midpoint(book)
  if (mid !== null) {
    return { symbol, price: mid, source: 'midpoint' }
  }

  const recent = await db
    .select()
    .from(trades)
    .where(eq(trades.symbol, symbol))
    .orderBy(desc(trades.executedAt))
    .limit(PRICE_SAMPLE_SIZE)
  const average = movingAverage(recent.map((trade) => trade.priceCents))
  if (average !== null) {
    return { symbol, price: average, source: 'last_trade_ma' }
  }

  const [stock] = await db.select().from(stocks).where(eq(stocks.symbol, symbol))
  if (stock?.referencePriceCents != null) {
    return { symbol, price: stock.referencePriceCents, source: 'reference' }
  }

  return { symbol, price: null, source: 'none' }
}

export interface BalanceView {
  brokerId: string
  name: string
  cashBalanceCents: number
  positions: { symbol: string; quantity: number }[]
}

/** A broker's balance: settled cash plus its signed share positions, or `null`. */
export async function getBrokerBalance(
  db: Database,
  brokerId: string,
): Promise<BalanceView | null> {
  const [row] = await db.select().from(brokers).where(eq(brokers.id, brokerId))
  if (!row) {
    return null
  }

  const held = await db
    .select()
    .from(positions)
    .where(eq(positions.brokerId, brokerId))
    .orderBy(asc(positions.symbol))

  return {
    brokerId: row.id,
    name: row.name,
    cashBalanceCents: row.cashBalanceCents,
    positions: held.map((position) => ({
      symbol: position.symbol,
      quantity: position.quantity,
    })),
  }
}

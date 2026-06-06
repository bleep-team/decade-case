import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { brokers, orders, stocks, type Broker, type Database, type NewOrder } from '@decade/db'
import { generateQuoteLadder, stepReference, type LadderConfig } from './market-maker.js'
import { runCancel } from './run-cancel.js'

/** Default gentle drift applied to a reference each ambient tick. */
export const DEFAULT_MAX_DRIFT_CENTS = 50

/** Default two-sided ladder: a tight spread, five levels a dollar apart, 100 shares each. */
export const DEFAULT_LADDER: LadderConfig = {
  spreadCents: 20,
  levelStepCents: 100,
  depth: 5,
  quantity: 100,
}

/** Mock quotes carry a short TTL and are re-quoted; the expiry sweep is a backstop. */
export const DEFAULT_TTL_SECONDS = 120

/** The audit label recorded on house liquidity orders. */
const HOUSE_DOCUMENT = 'house'

/** What one market-maker pass did: the quotes it pulled and the quotes it posted. */
export interface MarketMakerResult {
  symbol: string
  /** Prior mock quotes cancelled through the shared cancel path before re-quoting. */
  cancelledOrderIds: string[]
  /** Fresh mock quotes inserted as `open` rows, to be matched via `order/submitted`. */
  submittedOrderIds: string[]
}

/**
 * Post a fresh two-sided mock quote ladder for a symbol, re-quoting any prior
 * mock quotes. Routed like {@link runMatch} and {@link runCancel}: a DB-only
 * body the Inngest triggers (reactive on user submit, ambient on a cron) wrap.
 *
 * It (1) loads the symbol's drifting reference price, (2) cancels the resting
 * mock quotes through the shared cancel path so they never accumulate, then
 * (3) inserts the new ladder as `open` orders via the normal submit path — real
 * orders the real engine matches, no faked executions. A no-op (no rows) when
 * no mock brokers are seeded or the symbol has no reference price.
 *
 * `now` is injected so the short quote TTL is deterministic in tests.
 */
export async function runMarketMaker(
  db: Database,
  symbol: string,
  config: LadderConfig = DEFAULT_LADDER,
  now: Date = new Date(),
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<MarketMakerResult> {
  const empty: MarketMakerResult = { symbol, cancelledOrderIds: [], submittedOrderIds: [] }

  const [stock] = await db.select().from(stocks).where(eq(stocks.symbol, symbol))
  const reference = stock?.referencePriceCents
  if (reference == null) {
    return empty
  }

  // House liquidity accounts. The most-funded mock broker posts bids (the cash
  // leg is enforced when its bid fills); a second mock broker, if seeded, posts
  // asks by shorting. With a single mock broker it posts both sides — self-trade
  // prevention keeps its own bid and ask from ever crossing.
  const mockBrokers = await db
    .select()
    .from(brokers)
    .where(eq(brokers.isMock, true))
    .orderBy(desc(brokers.cashBalanceCents))
  if (mockBrokers.length === 0) {
    return empty
  }
  const bidBroker: Broker = mockBrokers[0]!
  const askBroker: Broker = mockBrokers[1] ?? bidBroker

  // Re-quote through the shared cancel path: pull the prior resting mock quotes
  // before posting new ones so the book does not accumulate stale liquidity.
  const mockBrokerIds = mockBrokers.map((b) => b.id)
  const priorQuotes = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.symbol, symbol),
        inArray(orders.brokerId, mockBrokerIds),
        inArray(orders.status, ['open', 'partially_filled']),
      ),
    )
  const cancelledOrderIds: string[] = []
  for (const { id } of priorQuotes) {
    await runCancel(db, id, now)
    cancelledOrderIds.push(id)
  }

  const ladder = generateQuoteLadder(reference, config)
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)
  const quote = (
    brokerId: string,
    side: 'bid' | 'ask',
    priceCents: number,
    quantity: number,
  ): NewOrder => ({
    brokerId,
    ownerDocument: HOUSE_DOCUMENT,
    symbol,
    side,
    type: 'limit',
    limitPriceCents: priceCents,
    quantity,
    remaining: quantity,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    expiresAt,
  })

  const newOrders: NewOrder[] = [
    ...ladder.bids.map((q) => quote(bidBroker.id, 'bid', q.priceCents, q.quantity)),
    ...ladder.asks.map((q) => quote(askBroker.id, 'ask', q.priceCents, q.quantity)),
  ]
  const inserted = await db.insert(orders).values(newOrders).returning({ id: orders.id })

  return { symbol, cancelledOrderIds, submittedOrderIds: inserted.map((row) => row.id) }
}

/** Symbols with a reference price set — the ones the ambient cron quotes around. */
export async function quotableSymbols(db: Database): Promise<string[]> {
  const rows = await db
    .select({ symbol: stocks.symbol })
    .from(stocks)
    .where(isNotNull(stocks.referencePriceCents))
  return rows.map((row) => row.symbol)
}

/** True when an order belongs to a mock (house) broker — used to break re-quote loops. */
export async function isMockOrder(db: Database, orderId: string): Promise<boolean> {
  const [row] = await db
    .select({ isMock: brokers.isMock })
    .from(orders)
    .innerJoin(brokers, eq(orders.brokerId, brokers.id))
    .where(eq(orders.id, orderId))
  return row?.isMock ?? false
}

/**
 * Advance a symbol's reference price by a bounded, deterministic drift and
 * persist it. `seed` (a nonce, e.g. a minute counter) makes the step
 * reproducible; the pure {@link stepReference} stays clock-free. No-op (returns
 * null) when the symbol has no reference price yet.
 */
export async function driftReference(
  db: Database,
  symbol: string,
  seed: number,
  maxDriftCents: number = DEFAULT_MAX_DRIFT_CENTS,
): Promise<number | null> {
  const [stock] = await db.select().from(stocks).where(eq(stocks.symbol, symbol))
  const reference = stock?.referencePriceCents
  if (reference == null) {
    return null
  }
  const next = stepReference(reference, seed, { maxDriftCents })
  await db.update(stocks).set({ referencePriceCents: next }).where(eq(stocks.symbol, symbol))
  return next
}

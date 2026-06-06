import { sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { brokers, stocks } from './schema/tables.js'

/** The reference universe with anchor prices the market-maker quotes around (integer cents). */
export const SEED_STOCKS: ReadonlyArray<{
  symbol: string
  name: string
  referencePriceCents: number
}> = [
  { symbol: 'AAPL', name: 'Apple Inc.', referencePriceCents: 19_000 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', referencePriceCents: 25_000 },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', referencePriceCents: 17_000 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', referencePriceCents: 14_000 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', referencePriceCents: 42_000 },
]

/**
 * House liquidity accounts (`isMock`) the market-maker posts real orders from.
 * Deterministic ids so they are easy to reference in demos. The buyer is amply
 * funded so its bids settle; the seller relies on shorting for ask-side
 * liquidity (only the cash leg is enforced, so a short is sound bookkeeping).
 */
export const MOCK_BROKERS: ReadonlyArray<{
  id: string
  clerkUserId: string
  name: string
  cashBalanceCents: number
  isMock: true
}> = [
  {
    id: '00000000-0000-0000-0000-0000000000c1',
    clerkUserId: 'house_mm_buyer',
    name: 'House Market-Maker (Buy)',
    cashBalanceCents: 1_000_000_000_000,
    isMock: true,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c2',
    clerkUserId: 'house_mm_seller',
    name: 'House Market-Maker (Sell)',
    cashBalanceCents: 1_000_000_000_000,
    isMock: true,
  },
]

/**
 * Upsert the reference stock universe and set each symbol's reference price.
 * Idempotent: re-running refreshes names/prices without duplicating rows.
 */
export async function seedStocks(db: Database): Promise<void> {
  await db
    .insert(stocks)
    .values([...SEED_STOCKS])
    .onConflictDoUpdate({
      target: stocks.symbol,
      set: {
        name: sqlExcluded('name'),
        referencePriceCents: sqlExcluded('reference_price_cents'),
      },
    })
}

/** Insert the `isMock` house brokers with ample cash. Idempotent (no-op if present). */
export async function seedMockBrokers(db: Database): Promise<void> {
  await db
    .insert(brokers)
    .values([...MOCK_BROKERS])
    .onConflictDoNothing()
}

/** Seed the data the market-maker needs: reference prices + house liquidity accounts. */
export async function seedMarketData(db: Database): Promise<void> {
  await seedStocks(db)
  await seedMockBrokers(db)
}

// `excluded` is the row proposed for insertion; reference it so the upsert writes
// the new values on conflict. Kept tiny and local to avoid leaking SQL elsewhere.
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`)
}

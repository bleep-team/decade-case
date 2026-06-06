/**
 * Pure market-maker primitives: a two-sided quote-ladder generator and a
 * bounded reference-price step. Both are clock-free and side-effect-free so they
 * stay exhaustively unit-testable, mirroring the matching engine. The Inngest
 * triggers (reactive on user submit, ambient on a cron) wrap these.
 */

/** A single resting quote: a price level and the quantity offered there. */
export interface QuoteLevel {
  priceCents: number
  quantity: number
}

/** A two-sided ladder of resting quotes, best price first on each side. */
export interface QuoteLadder {
  /** Bids, descending by price (best/highest first). */
  bids: QuoteLevel[]
  /** Asks, ascending by price (best/lowest first). */
  asks: QuoteLevel[]
}

export interface LadderConfig {
  /**
   * Full top-of-book bid–ask spread in cents. Split evenly around the reference,
   * so an even value yields exact symmetry; an odd value rounds the half-spread.
   */
  spreadCents: number
  /** Price gap between adjacent levels on one side, in cents. */
  levelStepCents: number
  /** Number of price levels generated per side. */
  depth: number
  /** Quantity posted at each level, in whole shares. */
  quantity: number
}

/**
 * Generate a two-sided quote ladder around a reference price. The best ask sits
 * half a spread above the reference and the best bid half a spread below, with
 * each further level stepped outward by `levelStepCents`. The result is
 * symmetric around the reference, ordered best-first per side, and never crosses
 * itself (every bid is strictly below every ask) as long as the spread is
 * positive.
 */
export function generateQuoteLadder(
  referencePriceCents: number,
  config: LadderConfig,
): QuoteLadder {
  const { spreadCents, levelStepCents, depth, quantity } = config
  const halfSpread = Math.round(spreadCents / 2)

  const bids: QuoteLevel[] = []
  const asks: QuoteLevel[] = []
  for (let level = 0; level < depth; level += 1) {
    const offset = halfSpread + level * levelStepCents
    asks.push({ priceCents: referencePriceCents + offset, quantity })
    bids.push({ priceCents: referencePriceCents - offset, quantity })
  }
  return { bids, asks }
}

export interface DriftConfig {
  /** Maximum absolute change applied to the reference in one step, in cents. */
  maxDriftCents: number
  /** Lowest price the reference may drift to, in cents. Defaults to 1. */
  floorCents?: number
}

/**
 * Advance a reference price by a bounded, deterministic drift. The drift is a
 * pure function of `seed` (a nonce — e.g. a minute counter) and lands in
 * `[-maxDriftCents, +maxDriftCents]`, so the same seed always yields the same
 * step. The result is clamped to at least `floorCents` so the reference never
 * drifts to zero or negative.
 */
export function stepReference(
  referencePriceCents: number,
  seed: number,
  config: DriftConfig,
): number {
  const { maxDriftCents, floorCents = 1 } = config
  const span = 2 * maxDriftCents + 1
  const drift = (hashInt(seed) % span) - maxDriftCents
  return Math.max(floorCents, referencePriceCents + drift)
}

/** Deterministic 32-bit integer hash (unsigned), used to derive a drift from a seed. */
function hashInt(n: number): number {
  let x = n | 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = x ^ (x >>> 16)
  return x >>> 0
}

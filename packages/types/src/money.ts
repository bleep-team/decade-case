/**
 * Money is represented as an integer number of minor currency units (cents).
 * Prices, balances, and notionals never use floating point — every value in
 * the exchange is `Cents` so matching arithmetic stays exact.
 */
export type Cents = number

/** Convert a decimal dollar amount (e.g. 10.5) to integer cents (1050). */
export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * 100)
}

/** Convert integer cents (1050) back to a decimal dollar amount (10.5). */
export function centsToDollars(cents: Cents): number {
  return cents / 100
}

/**
 * USD formatter pinned to en-US so server and client render identically (no
 * hydration drift) and large figures get thousand separators.
 */
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Format integer cents as a grouped USD string (100000000 -> "$1,000,000.00"). */
export function formatUsd(cents: Cents): string {
  return usdFormatter.format(centsToDollars(cents))
}

/** Notional value of `quantity` shares at `price` cents each. */
export function notional(price: Cents, quantity: number): Cents {
  return price * quantity
}

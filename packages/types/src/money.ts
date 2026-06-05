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

/** Format integer cents as a USD string (1050 -> "$10.50"). */
export function formatUsd(cents: Cents): string {
  return `$${centsToDollars(cents).toFixed(2)}`
}

/** Notional value of `quantity` shares at `price` cents each. */
export function notional(price: Cents, quantity: number): Cents {
  return price * quantity
}

/**
 * Simple moving average over the last `window` values (defaults to all). Returns
 * null for an empty series. Used by the "current stock price" endpoint, which
 * averages recent bid/ask or trade prices.
 */
export function movingAverage(values: readonly number[], window?: number): number | null {
  if (values.length === 0) return null
  const size = window === undefined ? values.length : Math.min(window, values.length)
  const slice = values.slice(values.length - size)
  const sum = slice.reduce((total, value) => total + value, 0)
  return sum / slice.length
}

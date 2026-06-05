import { describe, expect, it } from 'vitest'
import { movingAverage } from './price.js'

describe('movingAverage', () => {
  it('averages the whole series by default', () => {
    expect(movingAverage([1000, 1100, 1200])).toBe(1100)
  })

  it('averages only the last `window` values', () => {
    expect(movingAverage([1000, 2000, 3000, 4000], 2)).toBe(3500)
  })

  it('clamps the window to the series length', () => {
    expect(movingAverage([1000, 2000], 10)).toBe(1500)
  })

  it('returns null for an empty series', () => {
    expect(movingAverage([])).toBeNull()
  })
})

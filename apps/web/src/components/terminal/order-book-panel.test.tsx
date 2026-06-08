import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { OrderBookSnapshot } from '@decade/types'
import { OrderBookPanel } from './order-book-panel'

afterEach(cleanup)

const book: OrderBookSnapshot = {
  symbol: 'AAPL',
  // Engine convention: best (lowest) ask first, best (highest) bid first.
  asks: [
    { price: 10100, quantity: 5, orderCount: 1 },
    { price: 10200, quantity: 7, orderCount: 2 },
  ],
  bids: [
    { price: 10000, quantity: 4, orderCount: 1 },
    { price: 9900, quantity: 9, orderCount: 3 },
  ],
}

describe('OrderBookPanel', () => {
  it('renders asks above bids with the best ask adjacent to the spread', () => {
    const { container } = render(<OrderBookPanel book={book} />)
    const rows = Array.from(container.querySelectorAll('[data-side]')) as HTMLElement[]

    expect(rows.map((r) => r.dataset.side)).toEqual(['ask', 'ask', 'bid', 'bid'])
    // Asks descend toward the spread; the best (lowest) ask sits just above it.
    expect(rows.map((r) => r.dataset.price)).toEqual(['10200', '10100', '10000', '9900'])
  })

  it('marks ask rows with the loss side-marker and bid rows with the gain side-marker', () => {
    const { container } = render(<OrderBookPanel book={book} />)
    const rows = Array.from(container.querySelectorAll('[data-side]')) as HTMLElement[]

    for (const row of rows) {
      if (row.dataset.side === 'ask') {
        expect(row.className).toContain('loss')
        expect(row.className).not.toContain('gain')
      } else {
        expect(row.className).toContain('gain')
        expect(row.className).not.toContain('loss')
      }
    }
  })

  it('shows the spread between best bid and best ask', () => {
    const { getByTestId } = render(<OrderBookPanel book={book} />)
    // best ask 101.00 - best bid 100.00 = 1.00
    expect(getByTestId('book-spread').textContent).toContain('$1.00')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { formatUsd } from '@decade/types'
import { YouPanel, type FillRow, type HoldingRow, type OrderRow } from './you-panel'

afterEach(cleanup)

const holdings: HoldingRow[] = [{ symbol: 'AAPL', quantity: 12 }]

const orders: OrderRow[] = [
  {
    id: 'order-open',
    symbol: 'AAPL',
    side: 'bid',
    type: 'limit',
    limitPriceCents: 15000,
    quantity: 10,
    remaining: 4,
    status: 'partially_filled',
  },
  {
    id: 'order-filled',
    symbol: 'AAPL',
    side: 'ask',
    type: 'limit',
    limitPriceCents: 15100,
    quantity: 5,
    remaining: 0,
    status: 'filled',
  },
]

const fills: FillRow[] = [
  { tradeId: 'trade-1', symbol: 'AAPL', side: 'bid', price: 15000, quantity: 6 },
]

describe('YouPanel', () => {
  it('renders Holdings, Orders, and Fills tabs', () => {
    render(
      <YouPanel
        holdings={holdings}
        orders={orders}
        fills={fills}
        onCancel={vi.fn()}
        cashBalanceCents={0}
      />,
    )
    expect(screen.getByRole('tab', { name: /holdings/i })).not.toBeNull()
    expect(screen.getByRole('tab', { name: /orders/i })).not.toBeNull()
    expect(screen.getByRole('tab', { name: /fills/i })).not.toBeNull()
  })

  it('shows the broker cash balance formatted as USD', () => {
    render(
      <YouPanel
        holdings={holdings}
        orders={orders}
        fills={fills}
        onCancel={vi.fn()}
        cashBalanceCents={100000000}
      />,
    )
    expect(screen.getByText(/cash/i)).not.toBeNull()
    expect(screen.getByText(formatUsd(100000000))).not.toBeNull()
  })

  it('shows holdings on the default tab', () => {
    render(
      <YouPanel
        holdings={holdings}
        orders={orders}
        fills={fills}
        onCancel={vi.fn()}
        cashBalanceCents={0}
      />,
    )
    expect(screen.getByText('AAPL')).not.toBeNull()
    expect(screen.getByText('12')).not.toBeNull()
  })

  it('offers a cancel control only on a cancellable order and calls onCancel', () => {
    const onCancel = vi.fn()
    render(
      <YouPanel
        holdings={holdings}
        orders={orders}
        fills={fills}
        onCancel={onCancel}
        defaultTab="orders"
        cashBalanceCents={0}
      />,
    )

    expect(screen.queryByRole('button', { name: /cancel order order-filled/i })).toBeNull()

    const cancel = screen.getByRole('button', { name: /cancel order order-open/i })
    fireEvent.click(cancel)
    expect(onCancel).toHaveBeenCalledWith('order-open')
  })
})

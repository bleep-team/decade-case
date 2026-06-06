import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { HistoryView, type HistoryOrderRow, type HistoryTradeRow } from './history-view'

afterEach(cleanup)

const orders: HistoryOrderRow[] = [
  {
    id: 'order-1',
    symbol: 'AAPL',
    side: 'bid',
    type: 'limit',
    limitPriceCents: 15000,
    quantity: 10,
    remaining: 4,
    status: 'partially_filled',
    createdAt: '2026-06-06T12:00:00.000Z',
  },
]

const trades: HistoryTradeRow[] = [
  {
    tradeId: 'trade-1',
    symbol: 'AAPL',
    side: 'bid',
    priceCents: 15000,
    quantity: 6,
    executedAt: '2026-06-06T12:01:00.000Z',
  },
]

function renderView(overrides: Partial<React.ComponentProps<typeof HistoryView>> = {}) {
  return render(
    <HistoryView
      orders={orders}
      trades={trades}
      page={1}
      hasPrev={false}
      hasNext
      onPrevPage={vi.fn()}
      onNextPage={vi.fn()}
      {...overrides}
    />,
  )
}

describe('HistoryView', () => {
  it('renders Orders and Trades tabs', () => {
    renderView()
    expect(screen.getByRole('tab', { name: /orders/i })).not.toBeNull()
    expect(screen.getByRole('tab', { name: /trades/i })).not.toBeNull()
  })

  it('lists orders on the default tab', () => {
    renderView()
    expect(screen.getByText('order-1')).not.toBeNull()
    expect(screen.getByText('AAPL')).not.toBeNull()
  })

  it('lists trades on the Trades tab', () => {
    renderView({ defaultTab: 'trades' })
    expect(screen.getByText('trade-1')).not.toBeNull()
  })

  it('exposes pagination controls and pages forward', () => {
    const onNextPage = vi.fn()
    renderView({ onNextPage })
    const next = screen.getByRole('button', { name: /next page/i })
    fireEvent.click(next)
    expect(onNextPage).toHaveBeenCalled()
  })

  it('disables the Previous control on the first page', () => {
    renderView({ page: 1, hasPrev: false })
    const prev = screen.getByRole('button', { name: /previous page/i }) as HTMLButtonElement
    expect(prev.disabled).toBe(true)
  })

  it('shows an empty state when a tab has no rows', () => {
    renderView({ orders: [] })
    const orders = screen.getByRole('tabpanel')
    expect(within(orders).getByText(/no orders/i)).not.toBeNull()
  })
})

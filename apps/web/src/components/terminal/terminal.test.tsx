import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

// The Terminal imports the real server actions only to use as defaults; the
// tests inject their own handlers, so stub the module to avoid loading it.
vi.mock('@/app/actions/orders', () => ({
  submitOrderAction: vi.fn(),
  cancelOrderAction: vi.fn(),
}))

import { Terminal } from './terminal'

beforeEach(() => {
  // Market/account polling is best-effort; an empty body keeps panels inert.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch,
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Terminal symbol selection', () => {
  it('changes the active symbol and the panels read it', () => {
    render(
      <Terminal
        brokerId="broker-1"
        symbols={['AAPL', 'TSLA']}
        defaultOwnerDocument="DEMO-001"
        onSubmitOrder={vi.fn()}
        onCancelOrder={vi.fn()}
      />,
    )

    // The market panels (price + book) title themselves with the active symbol.
    const market = screen.getByRole('region', { name: 'Market' })
    expect(within(market).getByText('AAPL')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: 'TSLA' } })

    expect(within(market).getByText('TSLA')).not.toBeNull()
    expect(within(market).queryByText('AAPL')).toBeNull()
  })

  it('submits an order for the currently selected symbol', () => {
    const onSubmitOrder = vi.fn()
    render(
      <Terminal
        brokerId="broker-1"
        symbols={['AAPL', 'TSLA']}
        defaultOwnerDocument="DEMO-001"
        onSubmitOrder={onSubmitOrder}
        onCancelOrder={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: 'TSLA' } })
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '50.00' } })
    fireEvent.click(screen.getByRole('button', { name: /submit order/i }))

    expect(onSubmitOrder).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'TSLA' }))
  })
})

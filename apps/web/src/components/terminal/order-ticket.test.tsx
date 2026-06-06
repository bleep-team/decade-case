import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OrderTicket } from './order-ticket'

afterEach(cleanup)

describe('OrderTicket', () => {
  it('pre-fills the owner document with the supplied default', () => {
    render(<OrderTicket symbol="AAPL" defaultOwnerDocument="DEMO-001" onSubmit={vi.fn()} />)
    const owner = screen.getByLabelText(/owner document/i) as HTMLInputElement
    expect(owner.value).toBe('DEMO-001')
  })

  it('submits a limit bid with the formed payload (price in cents)', () => {
    const onSubmit = vi.fn()
    render(<OrderTicket symbol="AAPL" defaultOwnerDocument="DEMO-001" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150.25' } })
    fireEvent.click(screen.getByRole('button', { name: /submit order/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      ownerDocument: 'DEMO-001',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPrice: 15025,
      quantity: 10,
      expiresAt: null,
    })
  })

  it('disables the price field for a market order and submits a null price', () => {
    const onSubmit = vi.fn()
    render(<OrderTicket symbol="TSLA" defaultOwnerDocument="DEMO-001" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /^market$/i }))
    const price = screen.getByLabelText(/price/i) as HTMLInputElement
    expect(price.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /submit order/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'market', limitPrice: null, quantity: 5, symbol: 'TSLA' }),
    )
  })

  it('switches the side to ask when Sell is chosen', () => {
    const onSubmit = vi.fn()
    render(<OrderTicket symbol="AAPL" defaultOwnerDocument="DEMO-001" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /^sell$/i }))
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '10.00' } })
    fireEvent.click(screen.getByRole('button', { name: /submit order/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ side: 'ask', limitPrice: 1000 }),
    )
  })
})

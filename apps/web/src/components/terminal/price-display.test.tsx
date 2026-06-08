import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { PriceDisplay } from './price-display'

afterEach(cleanup)

describe('PriceDisplay', () => {
  it('renders the current price and a positive delta marked as a gain', () => {
    const { getByTestId } = render(
      <PriceDisplay symbol="AAPL" priceCents={15000} deltaCents={250} />,
    )
    expect(getByTestId('price-value').textContent).toContain('$150.00')

    const delta = getByTestId('price-delta')
    expect(delta.textContent).toContain('$2.50')
    expect(delta.className).toContain('gain')
    expect(delta.className).not.toContain('loss')
  })

  it('marks a negative delta as a loss', () => {
    const { getByTestId } = render(
      <PriceDisplay symbol="AAPL" priceCents={14750} deltaCents={-250} />,
    )
    const delta = getByTestId('price-delta')
    expect(delta.textContent).toContain('$2.50')
    expect(delta.className).toContain('loss')
    expect(delta.className).not.toContain('gain')
  })

  it('renders a placeholder when there is no price', () => {
    const { getByTestId } = render(
      <PriceDisplay symbol="AAPL" priceCents={null} deltaCents={null} />,
    )
    expect(getByTestId('price-value').textContent).toContain('—')
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SideLabel } from './side-label'

afterEach(cleanup)

describe('SideLabel', () => {
  it('renders a bid in the gain (green) color', () => {
    render(<SideLabel side="bid" />)
    const el = screen.getByText('bid')
    expect(el.className).toContain('text-gain')
  })

  it('renders an ask in the loss (red) color', () => {
    render(<SideLabel side="ask" />)
    const el = screen.getByText('ask')
    expect(el.className).toContain('text-loss')
  })

  it('keeps the textual label so color is never the only signal', () => {
    render(<SideLabel side="bid" />)
    expect(screen.getByText('bid').className).toContain('uppercase')
  })
})

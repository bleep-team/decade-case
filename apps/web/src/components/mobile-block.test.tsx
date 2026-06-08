import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MobileBlock } from './mobile-block'

afterEach(cleanup)

describe('MobileBlock', () => {
  it('renders the desktop-only interstitial', () => {
    render(<MobileBlock />)
    expect(screen.getByTestId('mobile-block')).not.toBeNull()
    expect(screen.getByRole('heading', { name: /built for desktop/i })).not.toBeNull()
  })

  it('offers no bypass — no buttons or links to continue', () => {
    render(<MobileBlock />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

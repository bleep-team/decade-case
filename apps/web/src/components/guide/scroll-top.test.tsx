import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ScrollTop } from './scroll-top'

afterEach(cleanup)

describe('ScrollTop', () => {
  it('stays out of the DOM until the page is scrolled', () => {
    // No scroll container in the test DOM, so it should render nothing.
    render(<ScrollTop />)
    expect(screen.queryByRole('button', { name: /scroll to top/i })).toBeNull()
  })
})

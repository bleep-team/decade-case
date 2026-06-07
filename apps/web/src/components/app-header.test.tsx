import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

// The header renders the Clerk user button; stub the module so tests don't load Clerk.
vi.mock('@clerk/nextjs', () => ({
  UserButton: () => <div data-testid="user-button" />,
}))

// The active-nav indicator reads the current path; stub it to the terminal route.
vi.mock('next/navigation', () => ({
  usePathname: () => '/app',
}))

import { AppHeader } from './app-header'

afterEach(cleanup)

describe('AppHeader', () => {
  it('exposes Terminal, History, and Developer links', () => {
    render(<AppHeader onReset={vi.fn()} />)
    const terminal = screen.getByRole('link', { name: /terminal/i }) as HTMLAnchorElement
    const history = screen.getByRole('link', { name: /history/i }) as HTMLAnchorElement
    const developer = screen.getByRole('link', { name: /developer/i }) as HTMLAnchorElement
    expect(terminal.getAttribute('href')).toBe('/app')
    expect(history.getAttribute('href')).toBe('/app/history')
    expect(developer.getAttribute('href')).toBe('/app/developer')
  })

  it('marks the current route as active', () => {
    render(<AppHeader onReset={vi.fn()} />)
    const terminal = screen.getByRole('link', { name: /terminal/i })
    expect(terminal.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /history/i }).getAttribute('aria-current')).toBeNull()
  })

  it('renders the Clerk user button', () => {
    render(<AppHeader onReset={vi.fn()} />)
    expect(screen.getByTestId('user-button')).not.toBeNull()
  })

  it('opens a confirmation dialog from the reset action', () => {
    render(<AppHeader onReset={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /reset demo/i }))
    expect(screen.getByRole('alertdialog')).not.toBeNull()
    expect(screen.getByText(/cancel your open orders/i)).not.toBeNull()
  })

  it('runs the reset only after confirmation', () => {
    const onReset = vi.fn()
    render(<AppHeader onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /reset demo/i }))
    expect(onReset).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /reset demo/i }))
    expect(onReset).toHaveBeenCalled()
  })
})

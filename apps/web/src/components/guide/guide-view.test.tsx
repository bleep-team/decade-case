import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GuideView } from './guide-view'

afterEach(cleanup)

describe('GuideView', () => {
  it('renders the page with its section headings', () => {
    render(<GuideView />)
    expect(screen.getByRole('heading', { level: 1, name: /how it works/i })).not.toBeNull()
    expect(screen.getByRole('heading', { name: /how matching works/i })).not.toBeNull()
    expect(screen.getByRole('heading', { name: /for developers/i })).not.toBeNull()
    expect(screen.getByRole('heading', { name: /under the hood/i })).not.toBeNull()
  })

  it('links to the terminal, developer surfaces, and the source repo', () => {
    render(<GuideView />)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/app')
    expect(hrefs).toContain('/app/developer')
    expect(hrefs.some((h) => h?.includes('github.com/bleep-team/decade-case'))).toBe(true)
  })

  it('shows the one-command container run', () => {
    render(<GuideView />)
    expect(screen.getByText(/docker compose up --build/)).not.toBeNull()
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GuideView } from './guide-view'

afterEach(cleanup)

describe('GuideView', () => {
  it('renders the guide with its section headings', () => {
    render(<GuideView />)
    expect(screen.getByRole('heading', { level: 1, name: 'Guide' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: /how matching works/i })).not.toBeNull()
    expect(screen.getByRole('heading', { name: /for developers/i })).not.toBeNull()
  })

  it('links to the terminal and developer surfaces to try things out', () => {
    render(<GuideView />)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/app')
    expect(hrefs).toContain('/app/developer')
  })

  it('shows the one-command container run', () => {
    render(<GuideView />)
    expect(screen.getByText('docker compose up --build')).not.toBeNull()
  })
})

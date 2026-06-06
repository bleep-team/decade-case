import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// The Developer page imports the real server actions only to use as defaults;
// the tests inject their own handlers, so stub the module to avoid loading it.
vi.mock('@/app/actions/developer', () => ({
  rotateApiKeyAction: vi.fn(),
  saveWebhookAction: vi.fn(),
}))

import { Developer } from './developer'

afterEach(cleanup)

function renderDeveloper() {
  render(
    <Developer
      baseUrl="https://exchange.test"
      apiKey={null}
      defaultWebhookUrl=""
      defaultWebhookSecret=""
      deliveries={[]}
      onRotate={vi.fn(async () => 'k')}
      onSaveWebhook={vi.fn()}
    />,
  )
}

describe('Developer tabs', () => {
  it('renders API key, Webhooks, and MCP & REST tabs', () => {
    renderDeveloper()
    expect(screen.getByRole('tab', { name: /api key/i })).not.toBeNull()
    expect(screen.getByRole('tab', { name: /webhooks/i })).not.toBeNull()
    expect(screen.getByRole('tab', { name: /mcp & rest/i })).not.toBeNull()
  })

  it('shows the API key section by default', () => {
    renderDeveloper()
    // The reveal control is unique to the API key card; the other cards are not mounted yet.
    expect(screen.getByRole('button', { name: /reveal/i })).not.toBeNull()
    expect(screen.queryByText('Integrate')).toBeNull()
  })

  it('switches to the MCP & REST section on tab change', () => {
    renderDeveloper()
    // Radix tabs activate on pointer-down, not a bare click.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /mcp & rest/i }))
    expect(screen.getByText('Integrate')).not.toBeNull()
  })

  it('switches to the Webhooks section on tab change', () => {
    renderDeveloper()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /webhooks/i }))
    expect(screen.getByLabelText(/url/i)).not.toBeNull()
  })
})

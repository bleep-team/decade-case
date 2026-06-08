import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IntegrationCard, MCP_TOOLS } from './integration-card'

afterEach(cleanup)

describe('IntegrationCard', () => {
  it('renders the MCP endpoint string', () => {
    render(<IntegrationCard baseUrl="https://exchange.test" />)
    expect(screen.getByText('https://exchange.test/api/mcp')).not.toBeNull()
  })

  it('lists every MCP tool', () => {
    render(<IntegrationCard baseUrl="https://exchange.test" />)
    for (const tool of [
      'submit_order',
      'get_order',
      'get_order_book',
      'get_price',
      'get_broker_balance',
    ]) {
      expect(screen.getByText(tool), `expected tool ${tool}`).not.toBeNull()
    }
  })

  it('keeps the tool list in sync with the exported constant', () => {
    expect(MCP_TOOLS).toEqual([
      'submit_order',
      'get_order',
      'get_order_book',
      'get_price',
      'get_broker_balance',
    ])
  })

  it('renders a REST curl quickstart against the base URL', () => {
    render(<IntegrationCard baseUrl="https://exchange.test" />)
    const quickstart = screen.getByLabelText(/rest quickstart/i)
    expect(quickstart.textContent).toContain('curl')
    expect(quickstart.textContent).toContain('https://exchange.test/api/orders')
  })
})

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { bookShape, brokerIdShape, orderIdShape, submitOrderShape, symbolShape } from './schemas.js'

export interface ExchangeMcpConfig {
  /** Base URL of the exchange REST API, e.g. https://decade.usebleep.com */
  baseUrl: string
  /** Optional bearer token forwarded to the REST API. */
  apiKey?: string
}

interface ApiResult {
  ok: boolean
  status: number
  text: string
}

/**
 * Build an MCP server whose tools sit on top of the exchange REST API. The app
 * mounts this behind a Streamable-HTTP transport at `/api/mcp`, letting an LLM
 * client submit orders and read the book / price / balances.
 */
export function createExchangeMcpServer(config: ExchangeMcpConfig): McpServer {
  const server = new McpServer({ name: 'decade-exchange', version: '0.0.1' })

  async function request(path: string, init?: RequestInit): Promise<ApiResult> {
    const headers = new Headers(init?.headers)
    headers.set('content-type', 'application/json')
    if (config.apiKey) {
      headers.set('authorization', `Bearer ${config.apiKey}`)
    }
    const response = await fetch(new URL(path, config.baseUrl), { ...init, headers })
    return { ok: response.ok, status: response.status, text: await response.text() }
  }

  function asContent(result: ApiResult) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.ok ? result.text : `Error ${result.status}: ${result.text}`,
        },
      ],
      isError: !result.ok,
    }
  }

  server.tool(
    'submit_order',
    'Submit a bid (buy) or ask (sell) order on behalf of a customer',
    submitOrderShape,
    async (args) =>
      asContent(await request('/api/orders', { method: 'POST', body: JSON.stringify(args) })),
  )

  server.tool(
    'get_order',
    'Get the status of an order by its id',
    orderIdShape,
    async ({ orderId }) => asContent(await request(`/api/orders/${orderId}`)),
  )

  server.tool(
    'get_order_book',
    'List the top of the order book (best bids/asks) for a symbol',
    bookShape,
    async ({ symbol, depth }) =>
      asContent(await request(`/api/stocks/${symbol}/book?depth=${depth}`)),
  )

  server.tool(
    'get_price',
    'Get the current (moving-average) price for a symbol',
    symbolShape,
    async ({ symbol }) => asContent(await request(`/api/stocks/${symbol}/price`)),
  )

  server.tool(
    'get_broker_balance',
    'Get the cash balance of a broker',
    brokerIdShape,
    async ({ brokerId }) => asContent(await request(`/api/brokers/${brokerId}/balance`)),
  )

  return server
}

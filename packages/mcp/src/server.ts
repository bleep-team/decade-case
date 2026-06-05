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

function createRequester(config: ExchangeMcpConfig) {
  return async function request(path: string, init?: RequestInit): Promise<ApiResult> {
    const headers = new Headers(init?.headers)
    headers.set('content-type', 'application/json')
    if (config.apiKey) {
      headers.set('authorization', `Bearer ${config.apiKey}`)
    }
    const response = await fetch(new URL(path, config.baseUrl), { ...init, headers })
    return { ok: response.ok, status: response.status, text: await response.text() }
  }
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

/**
 * Register the exchange tools on an MCP server. Shared by `createExchangeMcpServer`
 * (standalone) and the app's `/api/mcp` Streamable-HTTP transport, so both expose
 * exactly the same tool surface over the REST API.
 */
export function registerExchangeTools(server: McpServer, config: ExchangeMcpConfig): void {
  const request = createRequester(config)

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
}

/**
 * Build a standalone MCP server wired to the exchange REST API. The app mounts the
 * same tools behind a Streamable-HTTP transport at `/api/mcp` via `registerExchangeTools`.
 */
export function createExchangeMcpServer(config: ExchangeMcpConfig): McpServer {
  const server = new McpServer({ name: 'decade-exchange', version: '0.0.1' })
  registerExchangeTools(server, config)
  return server
}

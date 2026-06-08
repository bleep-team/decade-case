import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { bookShape, brokerIdShape, orderIdShape, submitOrderShape, symbolShape } from './schemas.js'

export interface ExchangeMcpConfig {
  /** Base URL of the exchange REST API, e.g. https://decade.usebleep.com */
  baseUrl: string
  /** Optional fallback bearer token, used when the caller presents none. */
  apiKey?: string
}

interface ApiResult {
  ok: boolean
  status: number
  text: string
}

/** The slice of an MCP tool handler's `extra` we read the caller's key from. */
interface ToolRequestContext {
  authInfo?: { token?: string }
  requestInfo?: { headers?: Record<string, string | string[] | undefined> }
}

/**
 * The bearer token the MCP caller presented, so each tool acts as *that* broker
 * against the REST API. Prefers a token parsed by an auth middleware, then falls
 * back to the raw `Authorization` header the transport forwards on `requestInfo`.
 * Returns undefined when no bearer is present (callers then use any static key).
 */
export function bearerFromExtra(extra: ToolRequestContext | undefined): string | undefined {
  const fromAuth = extra?.authInfo?.token
  if (fromAuth) {
    return fromAuth
  }
  const headers = extra?.requestInfo?.headers
  const raw = headers?.['authorization'] ?? headers?.['Authorization']
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) {
    return undefined
  }
  const [scheme, token] = value.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined
}

function createRequester(config: ExchangeMcpConfig) {
  return async function request(
    path: string,
    init?: RequestInit,
    apiKey?: string,
  ): Promise<ApiResult> {
    const headers = new Headers(init?.headers)
    headers.set('content-type', 'application/json')
    const key = apiKey ?? config.apiKey
    if (key) {
      headers.set('authorization', `Bearer ${key}`)
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
 * exactly the same tool surface over the REST API. Each tool forwards the caller's
 * bearer token, so an authenticated MCP client acts as its own broker.
 */
export function registerExchangeTools(server: McpServer, config: ExchangeMcpConfig): void {
  const request = createRequester(config)

  server.tool(
    'submit_order',
    'Submit a bid (buy) or ask (sell) order on behalf of a customer',
    submitOrderShape,
    async (args, extra) =>
      asContent(
        await request(
          '/api/orders',
          { method: 'POST', body: JSON.stringify(args) },
          bearerFromExtra(extra),
        ),
      ),
  )

  server.tool(
    'get_order',
    'Get the status of an order by its id',
    orderIdShape,
    async ({ orderId }, extra) =>
      asContent(await request(`/api/orders/${orderId}`, undefined, bearerFromExtra(extra))),
  )

  server.tool(
    'get_order_book',
    'List the top of the order book (best bids/asks) for a symbol',
    bookShape,
    async ({ symbol, depth }, extra) =>
      asContent(
        await request(
          `/api/stocks/${symbol}/book?depth=${depth}`,
          undefined,
          bearerFromExtra(extra),
        ),
      ),
  )

  server.tool(
    'get_price',
    'Get the current (moving-average) price for a symbol',
    symbolShape,
    async ({ symbol }, extra) =>
      asContent(await request(`/api/stocks/${symbol}/price`, undefined, bearerFromExtra(extra))),
  )

  server.tool(
    'get_broker_balance',
    'Get the cash balance of a broker',
    brokerIdShape,
    async ({ brokerId }, extra) =>
      asContent(
        await request(`/api/brokers/${brokerId}/balance`, undefined, bearerFromExtra(extra)),
      ),
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

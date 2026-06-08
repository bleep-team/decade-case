import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  balanceShape,
  bookShape,
  orderIdShape,
  submitOrderShape,
  symbolShape,
  type BookArgs,
  type OrderIdArgs,
  type SubmitOrderArgs,
  type SymbolArgs,
} from './schemas.js'
import { identityFromExtra, type McpIdentity, type ToolAuthExtra } from './identity.js'

/**
 * Result of a backend call, in the shape the tool surface renders. `text` is the
 * JSON body (or an error message); `ok` decides whether the tool reports an error.
 */
export interface ToolResult {
  ok: boolean
  status?: number
  text: string
}

/**
 * The broker-scoped operations the MCP tools expose. The host app supplies an
 * implementation that resolves the broker from `identity` and calls the shared
 * exchange service — so the tools stay transport-only and own no business logic.
 */
export interface ExchangeToolBackend {
  submitOrder(identity: McpIdentity, args: SubmitOrderArgs): Promise<ToolResult>
  getOrder(identity: McpIdentity, args: OrderIdArgs): Promise<ToolResult>
  getOrderBook(identity: McpIdentity, args: BookArgs): Promise<ToolResult>
  getPrice(identity: McpIdentity, args: SymbolArgs): Promise<ToolResult>
  getBrokerBalance(identity: McpIdentity): Promise<ToolResult>
}

function asContent(result: ToolResult) {
  return {
    content: [
      {
        type: 'text' as const,
        text: result.ok ? result.text : `Error ${result.status ?? 500}: ${result.text}`,
      },
    ],
    isError: !result.ok,
  }
}

/**
 * Register the exchange tools on an MCP server, dispatching each to `backend`.
 * Every tool distils the caller's identity from `extra` (OAuth user or forwarded
 * API key) and hands it to the backend, which acts as that broker — the tool
 * arguments never name the broker.
 */
export function registerExchangeTools(server: McpServer, backend: ExchangeToolBackend): void {
  server.tool(
    'submit_order',
    'Submit a bid (buy) or ask (sell) order on behalf of a customer, acting as the authenticated broker',
    submitOrderShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.submitOrder(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_order',
    'Get the status of an order by its id',
    orderIdShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.getOrder(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_order_book',
    'List the top of the order book (best bids/asks) for a symbol',
    bookShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.getOrderBook(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_price',
    'Get the current (order-book midpoint) price for a symbol',
    symbolShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.getPrice(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_broker_balance',
    'Get the cash balance and positions of the authenticated broker',
    balanceShape,
    async (_args, extra: ToolAuthExtra) =>
      asContent(await backend.getBrokerBalance(identityFromExtra(extra))),
  )
}

/**
 * Build a standalone MCP server wired to `backend`. The app mounts the same tools
 * behind a Streamable-HTTP transport at `/api/mcp` via `registerExchangeTools`.
 */
export function createExchangeMcpServer(backend: ExchangeToolBackend): McpServer {
  const server = new McpServer({ name: 'decade-exchange', version: '0.0.1' })
  registerExchangeTools(server, backend)
  return server
}

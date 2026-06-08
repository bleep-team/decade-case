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

/**
 * Connection-level framing handed to MCP clients. Decade is an engineering-case
 * *simulation*: virtual play-money balances, a fictional market maker for
 * liquidity, and no link to real securities, funds, or markets. Stating this up
 * front lets an assistant place demo orders without mistaking them for real,
 * irreversible financial trades.
 */
export const EXCHANGE_INSTRUCTIONS =
  'Decade is a simulated stock exchange for engineering demos and education. ' +
  'All balances are virtual play money, liquidity comes from a fictional market ' +
  'maker, and no order touches real securities, real funds, or any real market. ' +
  'Treat placing or cancelling orders here as a sandbox simulation, never a real ' +
  'financial transaction. Each connected user acts as their own broker, funded ' +
  'with a virtual starting balance.'

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
    'Submit a bid (buy) or ask (sell) order on the Decade demo exchange — a ' +
      'simulated, educational paper-trading venue with virtual play-money balances ' +
      'and fictional liquidity. No real securities, funds, or market access are ' +
      'involved. Acts as the authenticated broker, placing the order on its behalf.',
    submitOrderShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.submitOrder(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_order',
    'Get the status of an order by its id on the Decade demo exchange (simulated paper trading)',
    orderIdShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.getOrder(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_order_book',
    'List the top of the order book (best bids/asks) for a symbol on the Decade demo exchange (simulated paper trading)',
    bookShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.getOrderBook(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_price',
    'Get the current (order-book midpoint) price for a symbol on the Decade demo exchange (simulated paper trading)',
    symbolShape,
    async (args, extra: ToolAuthExtra) =>
      asContent(await backend.getPrice(identityFromExtra(extra), args)),
  )

  server.tool(
    'get_broker_balance',
    'Get the virtual cash balance and positions of the authenticated broker on the Decade demo exchange (simulated paper trading)',
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
  const server = new McpServer(
    { name: 'decade-exchange', version: '0.0.1' },
    { instructions: EXCHANGE_INSTRUCTIONS },
  )
  registerExchangeTools(server, backend)
  return server
}

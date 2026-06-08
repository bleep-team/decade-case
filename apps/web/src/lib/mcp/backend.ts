import { UnauthorizedError } from '@decade/auth'
import type { Broker, Database } from '@decade/db'
import type { ExchangeToolBackend, McpIdentity, ToolResult } from '@decade/mcp'
import {
  createOrder,
  getBrokerBalance,
  getOrder,
  getOrderBook,
  getPrice,
} from '@/lib/exchange-service'
import { submitOrderSchema } from '@/lib/validation'
import { resolveMcpBroker } from './identity'

function ok(data: unknown): ToolResult {
  return { ok: true, text: JSON.stringify(data) }
}

function fail(status: number, message: string): ToolResult {
  return { ok: false, status, text: message }
}

/**
 * Build the backend that fulfils the MCP tools against the shared exchange
 * service. Every broker-scoped call resolves the acting broker from the caller's
 * identity (OAuth user or forwarded API key) and then runs the *same* service the
 * REST routes use — no HTTP round-trip and no duplicated business logic.
 */
export function createServiceBackend(db: Database): ExchangeToolBackend {
  async function withBroker(
    identity: McpIdentity,
    run: (broker: Broker) => Promise<ToolResult>,
  ): Promise<ToolResult> {
    let broker: Broker
    try {
      broker = await resolveMcpBroker(db, identity)
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return fail(401, 'unauthorized')
      }
      throw error
    }
    return run(broker)
  }

  return {
    submitOrder: (identity, args) =>
      withBroker(identity, async (broker) => {
        const parsed = submitOrderSchema.safeParse(args)
        if (!parsed.success) {
          return fail(400, JSON.stringify(parsed.error.flatten()))
        }
        return ok(await createOrder(db, broker, parsed.data))
      }),

    getOrder: (identity, args) =>
      withBroker(identity, async () => {
        const order = await getOrder(db, args.orderId)
        return order ? ok(order) : fail(404, 'not_found')
      }),

    getOrderBook: (identity, args) =>
      withBroker(identity, async () => ok(await getOrderBook(db, args.symbol, args.depth))),

    getPrice: (identity, args) =>
      withBroker(identity, async () => ok(await getPrice(db, args.symbol))),

    getBrokerBalance: (identity) =>
      withBroker(identity, async (broker) => {
        const balance = await getBrokerBalance(db, broker.id)
        return balance ? ok(balance) : fail(404, 'not_found')
      }),
  }
}

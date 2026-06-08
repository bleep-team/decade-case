import { z } from 'zod'

/** Tool input shapes (zod raw shapes) shared by the MCP server and its tests. */

/**
 * Submit-order arguments. The acting broker is resolved from the caller's
 * identity (OAuth user or forwarded API key), never the tool args — so there is
 * deliberately no `brokerId` field. `ownerDocument` stays a customer audit label.
 */
export const submitOrderShape = {
  ownerDocument: z.string().describe('Document number of the customer who owns the order'),
  symbol: z.string().describe('Stock symbol, e.g. AAPL'),
  side: z.enum(['bid', 'ask']).describe('bid = buy, ask = sell'),
  type: z.enum(['limit', 'market']).default('limit'),
  limitPrice: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .describe('Price in integer cents; required for limit orders'),
  quantity: z.number().int().positive(),
  expiresAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .describe('ISO timestamp; null = good-till-cancelled'),
}

export const orderIdShape = {
  orderId: z.string().describe('Order identifier returned at submission'),
}

export const symbolShape = {
  symbol: z.string().describe('Stock symbol, e.g. AAPL'),
}

export const bookShape = {
  symbol: z.string(),
  depth: z.number().int().positive().max(50).default(10),
}

/**
 * Balance lookup takes no arguments: the broker is always the authenticated
 * caller, so there is nothing to pass.
 */
export const balanceShape = {}

export type SubmitOrderArgs = z.infer<z.ZodObject<typeof submitOrderShape>>
export type OrderIdArgs = z.infer<z.ZodObject<typeof orderIdShape>>
export type SymbolArgs = z.infer<z.ZodObject<typeof symbolShape>>
export type BookArgs = z.infer<z.ZodObject<typeof bookShape>>

import { z } from 'zod'

/** Tool input shapes (zod raw shapes) shared by the MCP server and its tests. */

export const submitOrderShape = {
  brokerId: z.string().describe('The broker submitting the order'),
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

export const brokerIdShape = {
  brokerId: z.string(),
}

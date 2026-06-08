import { z } from 'zod'

/** Request body for `POST /api/orders` — mirrors the case's minimum order fields. */
export const submitOrderSchema = z
  .object({
    // The acting broker is resolved from the authenticated session / API key.
    // A `brokerId` may be sent (the case lists it as an order field), but it is
    // only checked for equality against that identity — a mismatch is rejected,
    // never used to act as another broker. Kept a plain string (not uuid) so it
    // matches whatever the broker's real id is; the equality check is the gate.
    brokerId: z.string().min(1).optional(),
    ownerDocument: z.string().min(1),
    symbol: z.string().min(1).max(16),
    side: z.enum(['bid', 'ask']),
    type: z.enum(['limit', 'market']).default('limit'),
    /** Integer cents. Required for limit orders, omitted/null for market orders. */
    limitPrice: z.number().int().positive().nullable().optional(),
    quantity: z.number().int().positive(),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .refine((order) => order.type === 'market' || order.limitPrice != null, {
    message: 'limit orders require a limitPrice (in cents)',
    path: ['limitPrice'],
  })
  .refine((order) => order.type !== 'market' || order.limitPrice == null, {
    message: 'market orders must not carry a limitPrice',
    path: ['limitPrice'],
  })

export type SubmitOrderBody = z.infer<typeof submitOrderSchema>

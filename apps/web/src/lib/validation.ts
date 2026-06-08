import { z } from 'zod'

/** Request body for `POST /api/orders` — mirrors the case's minimum order fields. */
export const submitOrderSchema = z
  .object({
    // The case lists "a broker identifier that is submitting the order" as an
    // order field — and every `orders` row records one. But it is the *order's*
    // data, taken from the authenticated principal (Clerk session or API key),
    // not a request input: submitting requires auth, so the broker is already
    // known. A `brokerId` in the body would be redundant (and a spoofing vector),
    // so the body carries none; any a client sends is ignored.
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

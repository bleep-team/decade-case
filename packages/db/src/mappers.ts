import type { Order } from '@decade/types'
import type { orders } from './schema/tables.js'

export type OrderRow = typeof orders.$inferSelect

/** Map a persisted order row (cents columns, Date timestamps) to the domain `Order`. */
export function toDomainOrder(row: OrderRow): Order {
  return {
    id: row.id,
    brokerId: row.brokerId,
    ownerDocument: row.ownerDocument,
    symbol: row.symbol,
    side: row.side,
    type: row.type,
    limitPrice: row.limitPriceCents,
    quantity: row.quantity,
    remaining: row.remaining,
    status: row.status,
    sequence: row.sequence,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  }
}

import {
  brokers,
  stocks,
  orders,
  trades,
  webhookEndpoints,
  webhookDeliveries,
  orderSide,
  orderType,
  orderStatus,
  webhookDeliveryStatus,
} from './schema/tables.js'

export {
  brokers,
  stocks,
  orders,
  trades,
  webhookEndpoints,
  webhookDeliveries,
  orderSide,
  orderType,
  orderStatus,
  webhookDeliveryStatus,
}

export { createDbClient } from './client.js'
export type { Database } from './client.js'
export { toDomainOrder } from './mappers.js'
export type { OrderRow } from './mappers.js'

export type Broker = typeof brokers.$inferSelect
export type NewBroker = typeof brokers.$inferInsert
export type NewOrder = typeof orders.$inferInsert
export type TradeRow = typeof trades.$inferSelect
export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect
export type StockRow = typeof stocks.$inferSelect

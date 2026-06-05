import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const orderSide = pgEnum('order_side', ['bid', 'ask'])
export const orderType = pgEnum('order_type', ['limit', 'market'])
export const orderStatus = pgEnum('order_status', [
  'open',
  'partially_filled',
  'filled',
  'cancelled',
  'expired',
])
export const webhookDeliveryStatus = pgEnum('webhook_delivery_status', [
  'pending',
  'delivered',
  'failed',
])

/** A broker firm — one Clerk user account, holding a cash balance in cents. */
export const brokers = pgTable('brokers', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  name: text('name').notNull(),
  cashBalanceCents: bigint('cash_balance_cents', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Reference data for tradeable symbols. */
export const stocks = pgTable('stocks', {
  symbol: text('symbol').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Monotonic submission counter — the price-time priority tiebreaker. */
    sequence: bigserial('sequence', { mode: 'number' }).notNull(),
    brokerId: uuid('broker_id')
      .notNull()
      .references(() => brokers.id),
    ownerDocument: text('owner_document').notNull(),
    symbol: text('symbol')
      .notNull()
      .references(() => stocks.symbol),
    side: orderSide('side').notNull(),
    type: orderType('type').notNull(),
    /** Null for market orders. */
    limitPriceCents: bigint('limit_price_cents', { mode: 'number' }),
    quantity: integer('quantity').notNull(),
    remaining: integer('remaining').notNull(),
    status: orderStatus('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    // Drives book reads and the resting-book scan during matching.
    index('orders_book_idx').on(table.symbol, table.side, table.status),
    index('orders_broker_idx').on(table.brokerId),
  ],
)

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    symbol: text('symbol')
      .notNull()
      .references(() => stocks.symbol),
    /** Execution price in cents — the seller's (ask) price. */
    priceCents: bigint('price_cents', { mode: 'number' }).notNull(),
    quantity: integer('quantity').notNull(),
    bidOrderId: uuid('bid_order_id')
      .notNull()
      .references(() => orders.id),
    askOrderId: uuid('ask_order_id')
      .notNull()
      .references(() => orders.id),
    bidBrokerId: uuid('bid_broker_id')
      .notNull()
      .references(() => brokers.id),
    askBrokerId: uuid('ask_broker_id')
      .notNull()
      .references(() => brokers.id),
    executedAt: timestamp('executed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('trades_symbol_idx').on(table.symbol, table.executedAt)],
)

/** A broker-registered URL to receive execution results. */
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  brokerId: uuid('broker_id')
    .notNull()
    .references(() => brokers.id),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  endpointId: uuid('endpoint_id')
    .notNull()
    .references(() => webhookEndpoints.id),
  tradeId: uuid('trade_id')
    .notNull()
    .references(() => trades.id),
  status: webhookDeliveryStatus('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

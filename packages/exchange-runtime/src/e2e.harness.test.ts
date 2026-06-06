import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import {
  brokers,
  orders,
  positions,
  trades,
  webhookDeliveries,
  webhookEndpoints,
  type Broker,
  type Database,
  type NewOrder,
} from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import type { Realtime } from '@inngest/realtime'
import { signPayload, SIGNATURE_HEADER } from './webhook.js'
import { matchOrderFn } from './functions/match-order.js'
import { deliverWebhookFn } from './functions/deliver-webhook.js'

// The Inngest functions resolve their database through `getDb()`. Point it at the
// in-process pglite harness so the whole runtime path — match-order persisting a
// settlement, deliver-webhook reading the trade — runs with no external Postgres.
const dbRef = vi.hoisted(() => ({ current: undefined as unknown }))
vi.mock('./db.js', () => ({
  getDb: () => {
    if (!dbRef.current) throw new Error('test db not set')
    return dbRef.current as Database
  },
}))

// ---------------------------------------------------------------------------
// A tiny in-process Inngest driver.
//
// It registers the real Inngest functions and routes events to them by their
// trigger, invoking each function's actual handler with a minimal context. There
// is NO live Inngest dev server: `step.run` just runs the body, `step.sendEvent`
// re-enters the driver (so `order/submitted` → match-order → `trade/executed` →
// deliver-webhook flows in process), and `publish` is the spy passed in. This is
// enough to exercise submit → match → settle → realtime publish + webhook.
// ---------------------------------------------------------------------------

interface DriverEvent {
  name: string
  data: Record<string, unknown>
}

interface InProcessCtx {
  event: DriverEvent
  step: {
    run: <T>(id: string, body: () => Promise<T> | T) => Promise<T>
    sendEvent: (id: string, events: DriverEvent | DriverEvent[]) => Promise<void>
  }
  publish: Realtime.PublishFn
  runId: string
  attempt: number
}

// Inngest function configs are otherwise opaque; reach through the documented
// `opts.triggers` and the stored `fn` handler to drive them, mirroring the cast
// the other function-wiring tests use.
interface InngestFnLike {
  opts: { id: string; triggers?: Array<{ event?: string }> }
  fn: (ctx: InProcessCtx) => Promise<unknown>
}

function createInProcessInngest(fns: InngestFnLike[], publish: Realtime.PublishFn) {
  const ctxFor = (event: DriverEvent): InProcessCtx => ({
    event,
    step: {
      run: async (_id, body) => body(),
      sendEvent: async (_id, events) => {
        for (const e of Array.isArray(events) ? events : [events]) {
          await send(e)
        }
      },
    },
    publish,
    runId: 'in-process',
    attempt: 0,
  })

  async function send(event: DriverEvent): Promise<void> {
    for (const fn of fns) {
      const triggered = (fn.opts.triggers ?? []).some((t) => t.event === event.name)
      if (triggered) await fn.fn(ctxFor(event))
    }
  }

  return { send }
}

const RUNTIME_FNS = [matchOrderFn, deliverWebhookFn] as unknown as InngestFnLike[]

describe('exchange end-to-end slice (pglite harness + in-process Inngest)', () => {
  let harness: TestDb
  let seller: Broker
  let buyer: Broker
  let publish: ReturnType<typeof vi.fn>
  let fetchMock: ReturnType<typeof vi.fn>
  let driver: ReturnType<typeof createInProcessInngest>

  beforeEach(async () => {
    if (!harness) harness = await createTestDb()
    await harness.reset()
    dbRef.current = harness.db
    seller = await harness.seedBroker({ name: 'Seller', cashBalanceCents: 100_000_000 })
    buyer = await harness.seedBroker({ name: 'Buyer', cashBalanceCents: 100_000_000 })

    publish = vi.fn(async () => undefined)
    // Mock the HTTP boundary so webhook delivery is "attempted" without a server.
    fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as Response)
    vi.stubGlobal('fetch', fetchMock)

    driver = createInProcessInngest(RUNTIME_FNS, publish as unknown as Realtime.PublishFn)
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    if (harness) await harness.close()
  })

  // Insert an `open` order exactly as the REST route does, then emit the
  // `order/submitted` event into the in-process driver to drive matching.
  async function submit(order: NewOrder): Promise<string> {
    const [row] = await harness.db.insert(orders).values(order).returning({ id: orders.id })
    const id = row!.id
    await driver.send({ name: 'order/submitted', data: { orderId: id, symbol: order.symbol } })
    return id
  }

  function ask(overrides: Partial<NewOrder> = {}): NewOrder {
    return {
      brokerId: seller.id,
      ownerDocument: 'doc_seller',
      symbol: 'AAPL',
      side: 'ask',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 1000,
      remaining: 1000,
      status: 'open',
      ...overrides,
    }
  }

  function bid(overrides: Partial<NewOrder> = {}): NewOrder {
    return {
      brokerId: buyer.id,
      ownerDocument: 'doc_buyer',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 1000,
      remaining: 1000,
      status: 'open',
      ...overrides,
    }
  }

  async function cashOf(brokerId: string): Promise<number> {
    const [row] = await harness.db.select().from(brokers).where(eq(brokers.id, brokerId))
    return row!.cashBalanceCents
  }

  async function positionOf(brokerId: string, symbol: string): Promise<number> {
    const [row] = await harness.db
      .select()
      .from(positions)
      .where(and(eq(positions.brokerId, brokerId), eq(positions.symbol, symbol)))
    return row?.quantity ?? 0
  }

  async function statusOf(orderId: string): Promise<string> {
    const [row] = await harness.db.select().from(orders).where(eq(orders.id, orderId))
    return row!.status
  }

  it('submits a crossing pair, persists a trade, and conserves cash and positions', async () => {
    const askId = await submit(ask({ limitPriceCents: 1000, quantity: 1000, remaining: 1000 }))
    const bidId = await submit(bid({ limitPriceCents: 2000, quantity: 1000, remaining: 1000 }))

    const tradeRows = await harness.db.select().from(trades)
    expect(tradeRows).toHaveLength(1)
    const notional = 1000 * 1000 // executes at the seller's (ask) 1000c
    expect(tradeRows[0]!.priceCents).toBe(1000)
    expect(tradeRows[0]!.quantity).toBe(1000)

    // Taker (the incoming bid) and maker (the resting ask) both fully fill.
    expect(await statusOf(bidId)).toBe('filled')
    expect(await statusOf(askId)).toBe('filled')

    // Both sides' cash moved and totals are conserved.
    expect(await cashOf(seller.id)).toBe(100_000_000 + notional)
    expect(await cashOf(buyer.id)).toBe(100_000_000 - notional)
    expect((await cashOf(seller.id)) + (await cashOf(buyer.id))).toBe(200_000_000)

    // Both sides' positions moved and net to zero.
    expect(await positionOf(buyer.id, 'AAPL')).toBe(1000)
    expect(await positionOf(seller.id, 'AAPL')).toBe(-1000)
    expect((await positionOf(buyer.id, 'AAPL')) + (await positionOf(seller.id, 'AAPL'))).toBe(0)
  })

  it('partially fills a large taker and leaves the correct remainder resting on the book', async () => {
    await submit(ask({ limitPriceCents: 1000, quantity: 400, remaining: 400 }))
    const bidId = await submit(bid({ limitPriceCents: 1000, quantity: 1000, remaining: 1000 }))

    const tradeRows = await harness.db.select().from(trades)
    expect(tradeRows).toHaveLength(1)
    expect(tradeRows[0]!.quantity).toBe(400)

    const [bidRow] = await harness.db.select().from(orders).where(eq(orders.id, bidId))
    expect(bidRow!.status).toBe('partially_filled')
    expect(bidRow!.remaining).toBe(600) // 1000 submitted - 400 filled rests on the book
  })

  it('rests both orders when they do not cross (no match)', async () => {
    const askId = await submit(ask({ limitPriceCents: 2000 }))
    const bidId = await submit(bid({ limitPriceCents: 1000 }))

    expect(await harness.db.select().from(trades)).toHaveLength(0)
    expect(await statusOf(askId)).toBe('open')
    expect(await statusOf(bidId)).toBe('open')
    expect(publish).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('emits a private realtime publish and a signed webhook on execution', async () => {
    // The buyer registers a webhook endpoint; delivery targets the resting+taker
    // brokers of the trade.
    const secret = 'whsec_e2e'
    const url = 'https://broker.example/hooks'
    await harness.db
      .insert(webhookEndpoints)
      .values({ brokerId: buyer.id, url, secret, active: true })

    await submit(ask({ limitPriceCents: 1000, quantity: 1000, remaining: 1000 }))
    await submit(bid({ limitPriceCents: 2000, quantity: 1000, remaining: 1000 }))

    const [tradeRow] = await harness.db.select().from(trades)
    expect(tradeRow).toBeDefined()

    // Private realtime publish: one per affected broker, on that broker's channel.
    expect(publish).toHaveBeenCalled()
    type PublishedMessage = { channel: string; topic: string; data: { fills: unknown[] } }
    const messages = await Promise.all(
      publish.mock.calls.map((c) => c[0] as Promise<PublishedMessage>),
    )
    const channels = messages.map((m) => m.channel)
    expect(channels).toContain(`broker:${buyer.id}`)
    expect(channels).toContain(`broker:${seller.id}`)
    const buyerMsg = messages.find((m) => m.channel === `broker:${buyer.id}`)!
    expect(buyerMsg.topic).toBe('updates')
    expect(buyerMsg.data.fills.length).toBeGreaterThan(0)

    // Webhook delivery attempted over the (mocked) HTTP boundary, with the
    // HMAC-signed payload the recipient verifies.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe(url)
    const body = init.body as string
    const headers = init.headers as Record<string, string>
    expect(JSON.parse(body)).toMatchObject({ event: 'trade.executed', tradeId: tradeRow!.id })
    expect(headers[SIGNATURE_HEADER]).toBe(signPayload(secret, body))

    // And the delivery was recorded.
    const deliveries = await harness.db.select().from(webhookDeliveries)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]!.status).toBe('delivered')
    expect(deliveries[0]!.tradeId).toBe(tradeRow!.id)
  })

  it('produces no execution for a self-trade', async () => {
    // The same broker rests an ask and then submits a crossing bid.
    const askId = await submit(ask({ brokerId: buyer.id, limitPriceCents: 1000 }))
    const bidId = await submit(bid({ brokerId: buyer.id, limitPriceCents: 2000 }))

    expect(await harness.db.select().from(trades)).toHaveLength(0)
    expect(await statusOf(askId)).toBe('open')
    expect(await statusOf(bidId)).toBe('open') // rests; never crossed itself
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an underfunded buy without settling a negative balance', async () => {
    await harness.db.update(brokers).set({ cashBalanceCents: 50 }).where(eq(brokers.id, buyer.id))
    await submit(ask({ limitPriceCents: 100, quantity: 1, remaining: 1 }))
    const bidId = await submit(bid({ limitPriceCents: 100, quantity: 1, remaining: 1 }))

    expect(await harness.db.select().from(trades)).toHaveLength(0)
    expect(await statusOf(bidId)).toBe('rejected')
    expect(await cashOf(buyer.id)).toBe(50) // unchanged, never negative
  })
})

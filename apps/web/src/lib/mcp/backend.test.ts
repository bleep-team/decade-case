import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { brokers, orders } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { hashApiKey } from '@decade/auth'

let harness: TestDb
const sendSpy = vi.fn()

// The shared service the backend calls reaches Inngest + the buying-power check
// through this module; point the matcher hand-off at a spy and fund every order.
vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
  inngest: { send: (...args: unknown[]) => sendSpy(...args) },
  hasBuyingPowerFor: async () => true,
}))

// Imported after the mock so the service module picks up the stubbed runtime.
const { createServiceBackend } = await import('./backend.js')

const validOrder = {
  ownerDocument: 'doc_1',
  symbol: 'AAPL',
  side: 'bid' as const,
  type: 'limit' as const,
  limitPrice: 1_000,
  quantity: 10,
}

describe('createServiceBackend — the userId/API-key → broker bridge', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
    sendSpy.mockClear()
  })

  it('resolves an OAuth user to its broker and submits as that broker', async () => {
    const backend = createServiceBackend(harness.db)

    const result = await backend.submitOrder({ userId: 'user_oauth' }, validOrder)
    expect(result.ok).toBe(true)
    const { orderId } = JSON.parse(result.text)

    // The broker was auto-provisioned for the OAuth user and owns the order.
    const [broker] = await harness.db
      .select()
      .from(brokers)
      .where(eq(brokers.clerkUserId, 'user_oauth'))
    expect(broker).toBeDefined()

    const [order] = await harness.db.select().from(orders).where(eq(orders.id, orderId))
    expect(order?.brokerId).toBe(broker!.id)
    expect(order?.ownerDocument).toBe('doc_1')

    // The matcher was notified for the right symbol.
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'order/submitted', data: { orderId, symbol: 'AAPL' } }),
    )
  })

  it('get_broker_balance acts as the OAuth user, never a brokerId in the args', async () => {
    const backend = createServiceBackend(harness.db)

    const result = await backend.getBrokerBalance({ userId: 'user_balance' })
    expect(result.ok).toBe(true)
    const balance = JSON.parse(result.text)

    const [broker] = await harness.db
      .select()
      .from(brokers)
      .where(eq(brokers.clerkUserId, 'user_balance'))
    expect(balance.brokerId).toBe(broker!.id)
    expect(balance.cashBalanceCents).toBe(broker!.cashBalanceCents)
  })

  it('keeps the API-key (mcp-remote) path working — resolves the broker by key hash', async () => {
    const apiKey = 'dk_test_key'
    const keyed = await harness.seedBroker({
      clerkUserId: 'user_keyed',
      apiKeyHash: hashApiKey(apiKey),
    })
    const backend = createServiceBackend(harness.db)

    const result = await backend.submitOrder({ apiKey }, validOrder)
    expect(result.ok).toBe(true)
    const { orderId } = JSON.parse(result.text)

    const [order] = await harness.db.select().from(orders).where(eq(orders.id, orderId))
    expect(order?.brokerId).toBe(keyed.id)
  })

  it('rejects an unknown API key as unauthorized', async () => {
    const backend = createServiceBackend(harness.db)
    const result = await backend.submitOrder({ apiKey: 'dk_nope' }, validOrder)
    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
  })

  it('rejects an anonymous call (no identity) as unauthorized', async () => {
    const backend = createServiceBackend(harness.db)
    const result = await backend.getBrokerBalance({})
    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
  })

  it('reports a 404 for an unknown order rather than throwing', async () => {
    await harness.seedBroker({ clerkUserId: 'user_lookup' })
    const backend = createServiceBackend(harness.db)
    const result = await backend.getOrder(
      { userId: 'user_lookup' },
      { orderId: '00000000-0000-0000-0000-000000000000' },
    )
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })
})

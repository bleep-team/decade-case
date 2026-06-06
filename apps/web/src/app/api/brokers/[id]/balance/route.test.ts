import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { positions } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb

vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
}))

function getBalance(id: string): Promise<Response> {
  return import('./route.js').then(({ GET }) =>
    GET(new Request(`http://localhost/api/brokers/${id}/balance`), {
      params: Promise.resolve({ id }),
    }),
  )
}

describe('GET /api/brokers/[id]/balance', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it('returns the broker cash balance and its positions', async () => {
    const broker = await harness.seedBroker({ cashBalanceCents: 42_000 })
    await harness.db.insert(positions).values([
      { brokerId: broker.id, symbol: 'AAPL', quantity: 10 },
      // A short position: signed, negative.
      { brokerId: broker.id, symbol: 'TSLA', quantity: -3 },
    ])

    const response = await getBalance(broker.id)
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.brokerId).toBe(broker.id)
    expect(body.cashBalanceCents).toBe(42_000)
    expect(body.positions).toEqual(
      expect.arrayContaining([
        { symbol: 'AAPL', quantity: 10 },
        { symbol: 'TSLA', quantity: -3 },
      ]),
    )
    expect(body.positions).toHaveLength(2)
  })

  it('returns an empty positions list when the broker holds nothing', async () => {
    const broker = await harness.seedBroker({ cashBalanceCents: 100 })

    const response = await getBalance(broker.id)
    const body = await response.json()
    expect(body.cashBalanceCents).toBe(100)
    expect(body.positions).toEqual([])
  })

  it('404s for an unknown broker', async () => {
    const response = await getBalance('00000000-0000-0000-0000-000000000000')
    expect(response.status).toBe(404)
  })
})

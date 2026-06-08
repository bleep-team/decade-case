import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { webhookEndpoints } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { eq } from 'drizzle-orm'

let harness: TestDb

vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
}))

// The acting broker is the Clerk session user — the route writes only its row.
vi.mock('@decade/auth/server', () => ({
  requireUserId: async () => 'user_webhook',
}))

function register(body: unknown): Promise<Response> {
  return import('./route.js').then(({ POST }) =>
    POST(
      new Request('http://localhost/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    ),
  )
}

describe('POST /api/webhooks', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it('upserts an endpoint whose row belongs to the authenticated broker', async () => {
    const broker = await harness.seedBroker({ clerkUserId: 'user_webhook' })

    const response = await register({ url: 'https://hooks.example/cb', secret: 'whsec_abc' })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.brokerId).toBe(broker.id)
    expect(body.url).toBe('https://hooks.example/cb')
    expect(body.secret).toBe('whsec_abc')

    const rows = await harness.db.select().from(webhookEndpoints)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.brokerId).toBe(broker.id)
    expect(rows[0]!.url).toBe('https://hooks.example/cb')
  })

  it('updates the existing endpoint in place rather than inserting a second', async () => {
    const broker = await harness.seedBroker({ clerkUserId: 'user_webhook' })
    await register({ url: 'https://old.example/cb', secret: 'whsec_old' })

    const response = await register({ url: 'https://new.example/cb' })
    expect(response.status).toBe(200)

    const rows = await harness.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.brokerId, broker.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.url).toBe('https://new.example/cb')
    // The secret is preserved across a url-only update (no silent rotation).
    expect(rows[0]!.secret).toBe('whsec_old')
  })

  it('mints a signing secret when the broker does not supply one', async () => {
    await harness.seedBroker({ clerkUserId: 'user_webhook' })

    const response = await register({ url: 'https://hooks.example/cb' })
    const body = await response.json()
    expect(typeof body.secret).toBe('string')
    expect(body.secret.length).toBeGreaterThan(0)
  })

  it('rejects a body without a url', async () => {
    await harness.seedBroker({ clerkUserId: 'user_webhook' })
    const response = await register({})
    expect(response.status).toBe(400)
  })
})

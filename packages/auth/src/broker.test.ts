import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { hashApiKey } from './api-key.js'
import {
  STARTING_BALANCE_CENTS,
  resolveBrokerByApiKey,
  resolveOrCreateBroker,
  rotateApiKey,
} from './broker.js'

// Runs against the in-process pglite harness — no external Postgres needed.
describe('broker identity (harness)', () => {
  let harness: TestDb

  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  describe('resolveOrCreateBroker', () => {
    it('provisions a funded broker on first call', async () => {
      const broker = await resolveOrCreateBroker(harness.db, 'user_alice')
      expect(broker.clerkUserId).toBe('user_alice')
      expect(broker.cashBalanceCents).toBe(STARTING_BALANCE_CENTS)
    })

    it('returns the same broker on later calls without duplicating or refunding', async () => {
      const first = await resolveOrCreateBroker(harness.db, 'user_alice')

      // Simulate the broker spending some cash between logins.
      const { brokers } = await import('@decade/db')
      const { eq } = await import('drizzle-orm')
      await harness.db.update(brokers).set({ cashBalanceCents: 42 }).where(eq(brokers.id, first.id))

      const second = await resolveOrCreateBroker(harness.db, 'user_alice')
      expect(second.id).toBe(first.id)
      expect(second.cashBalanceCents).toBe(42) // balance untouched, not re-funded

      const all = await harness.db.select().from(brokers)
      expect(all).toHaveLength(1) // no duplicate row
    })
  })

  describe('resolveBrokerByApiKey', () => {
    it('maps a presented key to its broker via the stored hash', async () => {
      const broker = await resolveOrCreateBroker(harness.db, 'user_bob')
      const key = await rotateApiKey(harness.db, broker.id)

      const resolved = await resolveBrokerByApiKey(harness.db, key)
      expect(resolved?.id).toBe(broker.id)
    })

    it('returns null for an unknown key', async () => {
      await resolveOrCreateBroker(harness.db, 'user_bob')
      expect(await resolveBrokerByApiKey(harness.db, 'dk_does_not_exist')).toBeNull()
    })
  })

  describe('rotateApiKey', () => {
    it('replaces the stored hash so the old key stops resolving and the new one works', async () => {
      const broker = await resolveOrCreateBroker(harness.db, 'user_carol')

      const firstKey = await rotateApiKey(harness.db, broker.id)
      expect(await resolveBrokerByApiKey(harness.db, firstKey)).not.toBeNull()

      const secondKey = await rotateApiKey(harness.db, broker.id)
      expect(secondKey).not.toBe(firstKey)
      expect(await resolveBrokerByApiKey(harness.db, firstKey)).toBeNull()
      expect((await resolveBrokerByApiKey(harness.db, secondKey))?.id).toBe(broker.id)
    })

    it('stores only the hash of the key, never the plaintext', async () => {
      const broker = await resolveOrCreateBroker(harness.db, 'user_dave')
      const key = await rotateApiKey(harness.db, broker.id)

      const { brokers } = await import('@decade/db')
      const { eq } = await import('drizzle-orm')
      const [row] = await harness.db.select().from(brokers).where(eq(brokers.id, broker.id))
      expect(row?.apiKeyHash).toBe(hashApiKey(key))
      expect(row?.apiKeyHash).not.toBe(key)
    })
  })
})

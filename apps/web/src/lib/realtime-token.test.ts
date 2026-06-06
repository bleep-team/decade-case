import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSubscriptionToken = vi.fn().mockResolvedValue({ token: 'tok_test' })
const requireUserId = vi.fn()
const resolveOrCreateBroker = vi.fn()

class FakeUnauthorizedError extends Error {}

vi.mock('@inngest/realtime', () => ({ getSubscriptionToken }))
vi.mock('@decade/auth', () => ({
  resolveOrCreateBroker,
  UnauthorizedError: FakeUnauthorizedError,
}))
vi.mock('@decade/auth/server', () => ({ requireUserId }))
vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => ({}),
  inngest: { id: 'decade-exchange' },
  brokerChannel: (brokerId: string) => ({ name: `broker:${brokerId}` }),
}))

const { mintBrokerSubscriptionToken } = await import('./realtime-token')

describe('mintBrokerSubscriptionToken', () => {
  beforeEach(() => {
    getSubscriptionToken.mockClear()
    requireUserId.mockReset()
    resolveOrCreateBroker.mockReset()
  })

  it('mints a token scoped to the authenticated broker’s own channel', async () => {
    requireUserId.mockResolvedValue('user_1')
    resolveOrCreateBroker.mockResolvedValue({ id: 'brk_1' })

    const token = await mintBrokerSubscriptionToken('brk_1')

    expect(token).toEqual({ token: 'tok_test' })
    expect(getSubscriptionToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'decade-exchange' }),
      { channel: { name: 'broker:brk_1' }, topics: ['updates'] },
    )
  })

  it('refuses to mint a token for a channel the caller does not own', async () => {
    requireUserId.mockResolvedValue('user_1')
    resolveOrCreateBroker.mockResolvedValue({ id: 'brk_1' })

    await expect(mintBrokerSubscriptionToken('brk_someone_else')).rejects.toBeInstanceOf(
      FakeUnauthorizedError,
    )
    expect(getSubscriptionToken).not.toHaveBeenCalled() // no token leaked
  })
})

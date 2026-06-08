import { describe, expect, it, vi } from 'vitest'

// The route only needs these at module load; a tool call never runs in this test
// because the unauthenticated request is rejected at the auth layer first.
vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => {
    throw new Error('getDb should not be reached for an unauthenticated call')
  },
  inngest: { send: vi.fn() },
  hasBuyingPowerFor: async () => true,
}))

describe('POST /api/mcp — auth gate', () => {
  it('rejects an unauthenticated tool call with 401 + the resource-metadata pointer', async () => {
    const { POST } = await import('./route.js')
    const response = await POST(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
    )

    expect(response.status).toBe(401)
    // RFC 9728: the challenge points the client at the protected-resource metadata.
    const challenge = response.headers.get('www-authenticate') ?? ''
    expect(challenge.toLowerCase()).toContain('bearer')
    expect(challenge).toContain('/.well-known/oauth-protected-resource/mcp')
  })
})

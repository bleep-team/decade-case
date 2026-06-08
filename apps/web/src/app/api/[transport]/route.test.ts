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
    // A cross-origin MCP client must be able to READ that challenge, so CORS has
    // to expose WWW-Authenticate; without it the connect hangs at "Checking
    // connection" before OAuth can begin.
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-expose-headers')).toContain('WWW-Authenticate')
  })

  it('answers the CORS preflight (OPTIONS) for the cross-origin client', async () => {
    const { OPTIONS } = await import('./route.js')
    const response = OPTIONS()
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-methods')).toContain('POST')
    expect(response.headers.get('access-control-allow-headers')?.toLowerCase()).toContain(
      'authorization',
    )
  })
})

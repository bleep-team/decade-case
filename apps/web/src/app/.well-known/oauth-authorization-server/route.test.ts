import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const PUBLISHABLE_KEY = `pk_test_${Buffer.from('clerk.example.com$').toString('base64')}`

// Clerk's auth-server handler proxies the instance's FAPI discovery document.
// Stub the network so the route can be exercised offline.
const AUTH_SERVER_METADATA = {
  issuer: 'https://clerk.example.com',
  authorization_endpoint: 'https://clerk.example.com/oauth/authorize',
  token_endpoint: 'https://clerk.example.com/oauth/token',
}

describe('GET /.well-known/oauth-authorization-server', () => {
  beforeAll(() => {
    process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] = PUBLISHABLE_KEY
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('proxies the Clerk authorization-server metadata with CORS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(AUTH_SERVER_METADATA))),
    )

    const { GET } = await import('./route.js')
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    const body = await response.json()
    expect(body.issuer).toBe('https://clerk.example.com')
    expect(body.token_endpoint).toBe('https://clerk.example.com/oauth/token')
  })

  it('answers the CORS preflight (OPTIONS) with 200 + CORS headers', async () => {
    const { OPTIONS } = await import('./route.js')
    const response = OPTIONS()
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })
})

import { beforeAll, describe, expect, it } from 'vitest'

// A publishable key Clerk can decode into a FAPI domain: base64 of the domain
// with the trailing '$' marker, prefixed `pk_test_`.
const PUBLISHABLE_KEY = `pk_test_${Buffer.from('clerk.example.com$').toString('base64')}`

describe('GET /.well-known/oauth-protected-resource/mcp', () => {
  beforeAll(() => {
    process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] = PUBLISHABLE_KEY
  })

  it('returns valid RFC 9728 protected-resource metadata with CORS', async () => {
    const { GET } = await import('./route.js')
    const response = GET(
      new Request('https://app.example.com/.well-known/oauth-protected-resource/mcp'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')

    const body = await response.json()
    expect(body.resource).toBe('https://app.example.com')
    expect(body.authorization_servers).toContain('https://clerk.example.com')
    // The scopes we declared for the connector.
    expect(body.scopes_supported).toEqual(['profile', 'email'])
  })

  it('answers the CORS preflight (OPTIONS) with 200 + CORS headers', async () => {
    const { OPTIONS } = await import('./route.js')
    const response = OPTIONS()
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-methods')).toContain('GET')
  })
})

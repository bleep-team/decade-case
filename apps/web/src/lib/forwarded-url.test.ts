import { describe, expect, it } from 'vitest'
import { publicOriginRequest } from './forwarded-url'

describe('publicOriginRequest', () => {
  it('returns the request untouched when no forwarded host is present', () => {
    const req = new Request('https://app.example.com/path')
    expect(publicOriginRequest(req)).toBe(req)
  })

  it('rewrites the host and protocol from the forwarded headers', () => {
    const req = new Request('http://localhost:3000/.well-known/x', {
      headers: { 'x-forwarded-host': 'tunnel.trycloudflare.com', 'x-forwarded-proto': 'https' },
    })
    expect(new URL(publicOriginRequest(req).url).origin).toBe('https://tunnel.trycloudflare.com')
  })

  it('uses the first host when a proxy chain appends several', () => {
    const req = new Request('http://localhost:3000/x', {
      headers: {
        'x-forwarded-host': 'public.example.com, internal.lb',
        'x-forwarded-proto': 'https',
      },
    })
    expect(new URL(publicOriginRequest(req).url).host).toBe('public.example.com')
  })

  it('preserves the path and keeps the original protocol when none is forwarded', () => {
    const req = new Request('http://localhost:3000/.well-known/oauth-protected-resource/mcp', {
      headers: { 'x-forwarded-host': 'tunnel.example.com' },
    })
    const url = new URL(publicOriginRequest(req).url)
    expect(url.protocol).toBe('http:')
    expect(url.pathname).toBe('/.well-known/oauth-protected-resource/mcp')
  })
})

import { describe, expect, it } from 'vitest'
import { bearerFromExtra } from './server.js'

// The MCP transport forwards the incoming HTTP headers on `extra.requestInfo`;
// `bearerFromExtra` is how each tool recovers the caller's API key to act as
// that broker against the REST API.
describe('bearerFromExtra', () => {
  it('reads the token from the Authorization header', () => {
    expect(bearerFromExtra({ requestInfo: { headers: { authorization: 'Bearer abc123' } } })).toBe(
      'abc123',
    )
  })

  it('prefers a token already parsed onto authInfo', () => {
    expect(
      bearerFromExtra({
        authInfo: { token: 'parsed' },
        requestInfo: { headers: { authorization: 'Bearer raw' } },
      }),
    ).toBe('parsed')
  })

  it('tolerates a capitalized header name and an array value', () => {
    expect(bearerFromExtra({ requestInfo: { headers: { Authorization: ['Bearer x'] } } })).toBe('x')
  })

  it('is case-insensitive on the scheme', () => {
    expect(bearerFromExtra({ requestInfo: { headers: { authorization: 'bearer y' } } })).toBe('y')
  })

  it('returns undefined when absent or not a bearer credential', () => {
    expect(bearerFromExtra(undefined)).toBeUndefined()
    expect(bearerFromExtra({ requestInfo: { headers: {} } })).toBeUndefined()
    expect(
      bearerFromExtra({ requestInfo: { headers: { authorization: 'Basic xyz' } } }),
    ).toBeUndefined()
  })
})

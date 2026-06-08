import { describe, expect, it } from 'vitest'
import { bearerFromExtra, identityFromExtra, userIdFromExtra } from './identity.js'

describe('identityFromExtra', () => {
  it('reads the OAuth user id from a verified token', () => {
    const extra = { authInfo: { token: 'oauth-abc', extra: { userId: 'user_42' } } }
    expect(identityFromExtra(extra)).toEqual({ userId: 'user_42' })
  })

  it('prefers the OAuth user id over a forwarded key when both are present', () => {
    const extra = { authInfo: { token: 'dk_key', extra: { userId: 'user_42' } } }
    expect(identityFromExtra(extra)).toEqual({ userId: 'user_42' })
  })

  it('falls back to the forwarded API key when there is no OAuth user', () => {
    const extra = { authInfo: { token: 'dk_secret' } }
    expect(identityFromExtra(extra)).toEqual({ apiKey: 'dk_secret' })
  })

  it('is anonymous when no credential is present', () => {
    expect(identityFromExtra(undefined)).toEqual({})
    expect(identityFromExtra({})).toEqual({})
    expect(identityFromExtra({ authInfo: { token: '' } })).toEqual({})
  })
})

describe('bearerFromExtra / userIdFromExtra', () => {
  it('extracts the bearer token, ignoring empty strings', () => {
    expect(bearerFromExtra({ authInfo: { token: 'dk_secret' } })).toBe('dk_secret')
    expect(bearerFromExtra({ authInfo: { token: '' } })).toBeUndefined()
    expect(bearerFromExtra(undefined)).toBeUndefined()
  })

  it('extracts the user id only when it is a non-empty string', () => {
    expect(userIdFromExtra({ authInfo: { extra: { userId: 'user_7' } } })).toBe('user_7')
    expect(userIdFromExtra({ authInfo: { extra: { userId: 42 } } })).toBeUndefined()
    expect(userIdFromExtra({ authInfo: {} })).toBeUndefined()
  })
})

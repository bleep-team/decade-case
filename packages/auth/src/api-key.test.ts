import { describe, expect, it } from 'vitest'
import { generateApiKey, hashApiKey, verifyApiKey } from './api-key.js'

describe('api-key', () => {
  it('mints a prefixed key and a stable 64-char SHA-256 hex hash', () => {
    const key = generateApiKey()
    expect(key.startsWith('dk_')).toBe(true)

    const hash = hashApiKey(key)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    // Hashing is deterministic — the same key always yields the same digest.
    expect(hashApiKey(key)).toBe(hash)
  })

  it('mints a different key each time', () => {
    expect(generateApiKey()).not.toBe(generateApiKey())
  })

  it('verifies a presented key against its stored hash (match)', () => {
    const key = generateApiKey()
    expect(verifyApiKey(key, hashApiKey(key))).toBe(true)
  })

  it('rejects a key that does not match the stored hash (mismatch)', () => {
    const key = generateApiKey()
    const other = generateApiKey()
    expect(verifyApiKey(other, hashApiKey(key))).toBe(false)
  })

  it('rejects a malformed stored hash rather than throwing', () => {
    expect(verifyApiKey(generateApiKey(), 'not-a-hash')).toBe(false)
  })
})

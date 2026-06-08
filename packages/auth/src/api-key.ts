import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Human-readable prefix on every issued key, so a leaked credential is recognisable. */
const API_KEY_PREFIX = 'dk_'
/** Entropy of the random secret portion of a key. */
const API_KEY_BYTES = 32

/**
 * Mint a fresh API key (the plaintext credential, shown to the broker exactly once).
 * Only its SHA-256 hash is ever persisted — see {@link hashApiKey}.
 */
export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(API_KEY_BYTES).toString('hex')}`
}

/** SHA-256 hex digest of an API key — the value stored in `brokers.api_key_hash`. */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Constant-time check that a presented key hashes to `storedHash`. Compares the
 * digests with `timingSafeEqual` so a caller cannot probe the hash byte by byte.
 */
export function verifyApiKey(presented: string, storedHash: string): boolean {
  const presentedHash = Buffer.from(hashApiKey(presented), 'hex')
  const expected = Buffer.from(storedHash, 'hex')
  if (presentedHash.length !== expected.length) {
    return false
  }
  return timingSafeEqual(presentedHash, expected)
}

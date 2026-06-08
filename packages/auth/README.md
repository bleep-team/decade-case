# @decade/auth

Clerk authentication, broker identity, and API keys.

- `@decade/auth/server` — re-exports Clerk's `auth` / `currentUser`, plus
  `requireUserId()` which throws `UnauthorizedError` for anonymous requests.
- `UnauthorizedError` — the 401 sentinel raised across the auth surface.
- Broker identity:
  - `resolveOrCreateBroker(db, userId)` — load or auto-provision the broker for a
    Clerk user, funded with `STARTING_BALANCE_CENTS`.
  - `resolveBrokerByApiKey(db, key)` — map a presented API key to its broker via the
    stored hash (the REST/`mcp-remote` credential path); `null` on no match.
  - `rotateApiKey(db, brokerId)` — mint a fresh key, store only its hash, return the
    plaintext once.
- API keys (`dk_`-prefixed): `generateApiKey()`, `hashApiKey(key)`, and
  `verifyApiKey(presented, storedHash)` — SHA-256 hashed, constant-time compared;
  only the hash is ever persisted (`brokers.api_key_hash`).

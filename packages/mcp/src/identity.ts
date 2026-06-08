/**
 * Caller identity behind an MCP tool call, distilled from the transport's auth.
 *
 * Two credentials reach the exchange MCP server and converge here:
 * - an **OAuth** token verified by Clerk, which yields a `userId`;
 * - a forwarded **API key** (the `mcp-remote` path), carried as the bearer token.
 *
 * The backend resolves a broker from whichever is present, preferring the OAuth
 * user. The acting broker is always the identity's — never the tool arguments.
 */
export interface McpIdentity {
  /** Clerk user id from a verified OAuth token, when the caller signed in. */
  userId?: string
  /** Forwarded API key (bearer), when the caller authenticated with a key. */
  apiKey?: string
}

/**
 * The slice of an MCP tool's `extra` we read for identity. The SDK's richer
 * `RequestHandlerExtra` is structurally assignable to this, so tool callbacks
 * can pass `extra` straight through.
 */
export interface ToolAuthExtra {
  authInfo?: {
    token?: string
    extra?: Record<string, unknown>
  }
}

/** Forwarded bearer token (the API-key path), or `undefined` when absent. */
export function bearerFromExtra(extra: ToolAuthExtra | undefined): string | undefined {
  const token = extra?.authInfo?.token
  return typeof token === 'string' && token.length > 0 ? token : undefined
}

/** Clerk user id from a verified OAuth token (`authInfo.extra.userId`), if any. */
export function userIdFromExtra(extra: ToolAuthExtra | undefined): string | undefined {
  const userId = extra?.authInfo?.extra?.['userId']
  return typeof userId === 'string' && userId.length > 0 ? userId : undefined
}

/**
 * Distil the caller's identity from a tool's `extra`. An OAuth `userId` takes
 * precedence over a forwarded API key, so a signed-in connector never falls back
 * to a stray key. Returns an empty identity when the call is anonymous.
 */
export function identityFromExtra(extra: ToolAuthExtra | undefined): McpIdentity {
  const userId = userIdFromExtra(extra)
  if (userId) {
    return { userId }
  }
  const apiKey = bearerFromExtra(extra)
  if (apiKey) {
    return { apiKey }
  }
  return {}
}

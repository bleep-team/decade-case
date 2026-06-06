/** Clamp bounds for list endpoints, so a client cannot ask for an unbounded page. */
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export interface Pagination {
  limit: number
  offset: number
}

/**
 * Parse `limit`/`offset` query params for a paginated list endpoint. `limit` is
 * clamped to [1, 200] (default 50); `offset` is clamped to >= 0 (default 0).
 * Non-numeric values fall back to the defaults.
 */
export function parsePagination(request: Request): Pagination {
  const params = new URL(request.url).searchParams

  const limitRaw = Number(params.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  const offsetRaw = Number(params.get('offset') ?? 0)
  const offset = Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0

  return { limit, offset }
}

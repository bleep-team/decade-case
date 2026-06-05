import { createDbClient, type Database } from '@decade/db'

let cached: Database | undefined

/** Lazily build a singleton DB client from `DATABASE_URL`. */
export function getDb(): Database {
  if (!cached) {
    const url = process.env['DATABASE_URL']
    if (!url) {
      throw new Error('DATABASE_URL is not set')
    }
    cached = createDbClient(url)
  }
  return cached
}

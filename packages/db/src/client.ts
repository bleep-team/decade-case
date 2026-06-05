import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/index.js'

// node-postgres (not the Neon serverless driver) so the same code path runs
// against a plain Postgres container locally *and* Neon in production, with full
// interactive transactions + `SELECT … FOR UPDATE` for race-free matching.
export type Database = ReturnType<typeof createDbClient>

export function createDbClient(connectionString: string) {
  const pool = new Pool({ connectionString })
  return drizzle(pool, { schema })
}

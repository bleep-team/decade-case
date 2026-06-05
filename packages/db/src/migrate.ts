import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  console.error('DATABASE_URL is required to run migrations')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const db = drizzle(pool)

console.info('Running migrations…')
await migrate(db, { migrationsFolder: './drizzle' })
console.info('Migrations complete.')

await pool.end()

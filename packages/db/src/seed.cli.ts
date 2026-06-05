import 'dotenv/config'
import { createDbClient } from './client.js'
import { stocks } from './schema/index.js'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  console.error('DATABASE_URL is required to seed')
  process.exit(1)
}

const db = createDbClient(connectionString)

const SYMBOLS: Array<{ symbol: string; name: string }> = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
]

console.info('Seeding reference stocks…')
await db.insert(stocks).values(SYMBOLS).onConflictDoNothing()
console.info(`Seeded ${SYMBOLS.length} stocks.`)

process.exit(0)

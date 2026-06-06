import 'dotenv/config'
import { createDbClient } from './client.js'
import { MOCK_BROKERS, SEED_STOCKS, seedMarketData } from './seed.js'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  console.error('DATABASE_URL is required to seed')
  process.exit(1)
}

const db = createDbClient(connectionString)

console.info('Seeding reference stocks + reference prices and house market-maker brokers…')
await seedMarketData(db)
console.info(`Seeded ${SEED_STOCKS.length} stocks with reference prices.`)
console.info(`Seeded ${MOCK_BROKERS.length} is_mock house brokers:`)
for (const broker of MOCK_BROKERS) {
  console.info(`  ${broker.name} → ${broker.id}`)
}

process.exit(0)

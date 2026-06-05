import 'dotenv/config'
import { createDbClient } from './client.js'
import { brokers } from './schema/index.js'

// Demo brokers for local/reproducible environments so the API has valid broker
// ids to submit orders against. NOT for production (real brokers come from Clerk
// sign-ups). Deterministic ids make them easy to use in demos and docs.
const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  console.error('DATABASE_URL is required to seed demo brokers')
  process.exit(1)
}

const db = createDbClient(connectionString)

const DEMO_BROKERS = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    clerkUserId: 'demo_seller',
    name: 'Demo Seller Brokerage',
    cashBalanceCents: 0,
  },
  {
    id: '00000000-0000-0000-0000-0000000000b2',
    clerkUserId: 'demo_buyer',
    name: 'Demo Buyer Brokerage',
    cashBalanceCents: 0,
  },
]

console.info('Seeding demo brokers…')
await db.insert(brokers).values(DEMO_BROKERS).onConflictDoNothing()
console.info(`Seeded ${DEMO_BROKERS.length} demo brokers:`)
for (const broker of DEMO_BROKERS) {
  console.info(`  ${broker.name} → ${broker.id}`)
}

process.exit(0)

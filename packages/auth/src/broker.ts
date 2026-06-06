import { eq } from 'drizzle-orm'
import { brokers, type Broker, type Database } from '@decade/db'
import { generateApiKey, hashApiKey } from './api-key.js'

/**
 * Cash a broker is funded with on first login. 1,000,000.00 in integer cents —
 * the starting balance settled for the demo exchange (PRD #5).
 */
export const STARTING_BALANCE_CENTS = 100_000_000

/** Options for {@link resolveOrCreateBroker}. */
export interface ResolveBrokerOptions {
  /** Display name for a freshly provisioned broker. Ignored if one already exists. */
  name?: string
  /** Starting cash, in cents, for a freshly provisioned broker. */
  startingBalanceCents?: number
}

/**
 * Return the broker for a Clerk user id, auto-provisioning a funded one on the
 * first call and returning the existing row (unchanged) on every call after.
 *
 * Idempotent: `clerk_user_id` is unique, so a lost insert race falls back to the
 * winner's row rather than creating a duplicate.
 */
export async function resolveOrCreateBroker(
  db: Database,
  clerkUserId: string,
  options: ResolveBrokerOptions = {},
): Promise<Broker> {
  const existing = await findBrokerByClerkUserId(db, clerkUserId)
  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(brokers)
    .values({
      clerkUserId,
      name: options.name ?? `Broker ${clerkUserId}`,
      cashBalanceCents: options.startingBalanceCents ?? STARTING_BALANCE_CENTS,
    })
    .onConflictDoNothing({ target: brokers.clerkUserId })
    .returning()

  if (created) {
    return created
  }

  // Lost the insert race to a concurrent first call — return the winner's row.
  const winner = await findBrokerByClerkUserId(db, clerkUserId)
  if (!winner) {
    throw new Error(`broker for ${clerkUserId} vanished after a conflicting insert`)
  }
  return winner
}

/**
 * Map a presented API key to its broker via the stored SHA-256 hash, or `null`
 * when no broker holds that key (an unknown/unauthorized credential).
 */
export async function resolveBrokerByApiKey(
  db: Database,
  presentedKey: string,
): Promise<Broker | null> {
  const [row] = await db
    .select()
    .from(brokers)
    .where(eq(brokers.apiKeyHash, hashApiKey(presentedKey)))
  return row ?? null
}

/**
 * Issue a fresh API key for a broker, replacing any prior key's hash so the old
 * key no longer resolves and the new one does. Returns the plaintext key — the
 * only moment it is recoverable, since only its hash is stored.
 */
export async function rotateApiKey(db: Database, brokerId: string): Promise<string> {
  const apiKey = generateApiKey()
  const [updated] = await db
    .update(brokers)
    .set({ apiKeyHash: hashApiKey(apiKey), updatedAt: new Date() })
    .where(eq(brokers.id, brokerId))
    .returning({ id: brokers.id })

  if (!updated) {
    throw new Error(`no broker ${brokerId} to rotate a key for`)
  }
  return apiKey
}

async function findBrokerByClerkUserId(
  db: Database,
  clerkUserId: string,
): Promise<Broker | undefined> {
  const [row] = await db.select().from(brokers).where(eq(brokers.clerkUserId, clerkUserId))
  return row
}

'use server'

import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { resolveOrCreateBroker, rotateApiKey } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { webhookEndpoints } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import type { WebhookPayload } from '@/components/developer/webhook-card'

/** A fresh signing secret, used when the broker saves without supplying one. */
function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`
}

/**
 * Rotate the signed-in broker's API key. The broker is resolved from the Clerk
 * session — never a parameter — so a caller only ever rotates its own key.
 * Returns the fresh plaintext key, the one moment it is recoverable.
 */
export async function rotateApiKeyAction(): Promise<string> {
  const userId = await requireUserId()
  const db = getDb()
  const broker = await resolveOrCreateBroker(db, userId)
  return rotateApiKey(db, broker.id)
}

/**
 * Register or update the signed-in broker's webhook endpoint, mirroring
 * `POST /api/webhooks`: upsert by broker, preserving an existing secret when the
 * form leaves it blank, else minting one. Returns the stored secret.
 */
export async function saveWebhookAction(payload: WebhookPayload): Promise<{ secret: string }> {
  const userId = await requireUserId()
  const db = getDb()
  const broker = await resolveOrCreateBroker(db, userId)

  const url = payload.url.trim()
  if (!url) {
    throw new Error('url required')
  }

  const [existing] = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.brokerId, broker.id))

  const secret = payload.secret.trim() || existing?.secret || generateSecret()

  const [endpoint] = existing
    ? await db
        .update(webhookEndpoints)
        .set({ url, secret, active: true })
        .where(eq(webhookEndpoints.id, existing.id))
        .returning({ secret: webhookEndpoints.secret })
    : await db
        .insert(webhookEndpoints)
        .values({ brokerId: broker.id, url, secret })
        .returning({ secret: webhookEndpoints.secret })

  return { secret: endpoint!.secret }
}

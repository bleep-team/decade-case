import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { webhookEndpoints } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { resolveActingBrokerOr401 } from '@/lib/broker-identity'

export const dynamic = 'force-dynamic'

/** A fresh signing secret, used when the broker does not supply one. */
function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`
}

interface RegisterBody {
  url?: unknown
  secret?: unknown
}

/**
 * Register or update the authenticated broker's webhook endpoint. Upsert by
 * broker: an existing endpoint is rewritten (url + secret, re-activated), else a
 * new one is inserted. The broker is resolved from the session/API key, never
 * the body, so a caller can only ever write its own endpoint. Returns the row,
 * including the signing secret the broker needs to verify deliveries.
 */
export async function POST(request: Request) {
  const broker = await resolveActingBrokerOr401(request)
  if (broker instanceof NextResponse) {
    return broker
  }

  let body: RegisterBody
  try {
    body = (await request.json()) as RegisterBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'url_required' }, { status: 400 })
  }

  const db = getDb()
  const [existing] = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.brokerId, broker.id))

  // Keep an explicit secret if given; otherwise preserve the existing one (so a
  // url change does not silently rotate it) or mint a fresh one for a new endpoint.
  const secret =
    typeof body.secret === 'string' && body.secret.length > 0
      ? body.secret
      : (existing?.secret ?? generateSecret())

  const [endpoint] = existing
    ? await db
        .update(webhookEndpoints)
        .set({ url, secret, active: true })
        .where(eq(webhookEndpoints.id, existing.id))
        .returning()
    : await db.insert(webhookEndpoints).values({ brokerId: broker.id, url, secret }).returning()

  return NextResponse.json({
    id: endpoint!.id,
    brokerId: endpoint!.brokerId,
    url: endpoint!.url,
    secret: endpoint!.secret,
    active: endpoint!.active,
  })
}

import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@decade/exchange-runtime'

export const dynamic = 'force-dynamic'

/** Readiness check: confirms the app is up and the database is reachable. */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`)
    return NextResponse.json({ status: 'ok', db: 'up' })
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 })
  }
}

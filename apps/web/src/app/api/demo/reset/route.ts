import { NextResponse } from 'next/server'
import { STARTING_BALANCE_CENTS } from '@decade/auth'
import { getDb, runDemoReset } from '@decade/exchange-runtime'
import { resolveActingBrokerOr401 } from '@/lib/broker-identity'

export const dynamic = 'force-dynamic'

/**
 * Reset the authenticated broker to a clean demo slate: cancel its resting
 * orders (through the shared cancel path) and restore the configured starting
 * cash. The broker is resolved from the session/API key, so a caller can only
 * ever reset itself.
 */
export async function POST(request: Request) {
  const broker = await resolveActingBrokerOr401(request)
  if (broker instanceof NextResponse) {
    return broker
  }

  const result = await runDemoReset(getDb(), broker.id, STARTING_BALANCE_CENTS)
  return NextResponse.json(result)
}

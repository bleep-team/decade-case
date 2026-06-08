import { NextResponse } from 'next/server'
import { getDb } from '@decade/exchange-runtime'
import { getBrokerBalance } from '@/lib/exchange-service'

export const dynamic = 'force-dynamic'

/** Return a broker's balance: settled cash plus its signed share positions. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const balance = await getBrokerBalance(getDb(), id)

  if (!balance) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(balance)
}

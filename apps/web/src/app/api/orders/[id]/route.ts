import { NextResponse } from 'next/server'
import { getDb } from '@decade/exchange-runtime'
import { getOrder } from '@/lib/exchange-service'

export const dynamic = 'force-dynamic'

/** Get the current status of an order by its id. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(getDb(), id)

  if (!order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(order)
}

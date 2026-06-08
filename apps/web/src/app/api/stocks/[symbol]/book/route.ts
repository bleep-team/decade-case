import { NextResponse } from 'next/server'
import { getDb } from '@decade/exchange-runtime'
import { getOrderBook } from '@/lib/exchange-service'

export const dynamic = 'force-dynamic'

/** List the top of the order book (best bids/asks) for a symbol. */
export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const depthParam = Number(new URL(request.url).searchParams.get('depth') ?? '10')
  const depth = Number.isFinite(depthParam) ? Math.min(Math.max(depthParam, 1), 50) : 10

  return NextResponse.json(await getOrderBook(getDb(), symbol, depth))
}

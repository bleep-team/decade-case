import { NextResponse } from 'next/server'
import { getDb } from '@decade/exchange-runtime'
import { getPrice } from '@/lib/exchange-service'

export const dynamic = 'force-dynamic'

/**
 * Current price for a symbol, per the case: the order-book midpoint (mean of the
 * best bid and best ask). When the book is one-sided or empty there is no
 * midpoint, so it falls back first to a moving average over recent trades, then
 * to the symbol's seeded reference price. The derivation lives in the shared
 * exchange service, so the MCP `get_price` tool answers identically.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  return NextResponse.json(await getPrice(getDb(), symbol))
}

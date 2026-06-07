'use client'

import { useEffect, useRef, useState } from 'react'
import type { OrderBookSnapshot, OrderSide, OrderStatus, OrderType } from '@decade/types'
import { submitOrderAction, cancelOrderAction } from '@/app/actions/orders'
import { useUrlState } from '@/lib/use-url-state'
import { OrderBookPanel } from './order-book-panel'
import { OrderTicket, type OrderTicketPayload } from './order-ticket'
import { PriceDisplay } from './price-display'
import { FillRow, HoldingRow, OrderRow, YouPanel } from './you-panel'

export interface TerminalProps {
  /** The signed-in broker, used to read its balance/positions. */
  brokerId: string
  /** Selectable instruments. */
  symbols: string[]
  /** Default customer document for the ticket. */
  defaultOwnerDocument: string
  /** Submit handler (defaults to the real server action; overridable in tests). */
  onSubmitOrder?: (payload: OrderTicketPayload) => void | Promise<void>
  /** Cancel handler (defaults to the real server action; overridable in tests). */
  onCancelOrder?: (orderId: string) => void | Promise<void>
}

interface PriceResponse {
  price: number | null
}
interface OrdersResponse {
  orders: Array<{
    orderId: string
    symbol: string
    side: OrderSide
    type: OrderType
    limitPriceCents: number | null
    quantity: number
    remaining: number
    status: OrderStatus
  }>
}
interface TradesResponse {
  trades: Array<{
    tradeId: string
    symbol: string
    side: OrderSide
    priceCents: number
    quantity: number
  }>
}
interface BalanceResponse {
  cashBalanceCents: number
  positions: Array<{ symbol: string; quantity: number }>
}

/**
 * Poll a JSON endpoint on an interval; best-effort. Returns the latest body and
 * a `loaded` flag (true after the first successful response, so the UI can show
 * a skeleton on first paint and never flash an empty state during load). `loaded`
 * is not reset across symbol switches, so switching never re-skeletons.
 */
function usePolledJson<T>(url: string, intervalMs = 1000): readonly [T | null, boolean] {
  const [data, setData] = useState<T | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const json = (await res.json()) as T
        if (active) {
          setData(json)
          setLoaded(true)
        }
      } catch {
        // Polling is best-effort; the terminal keeps its last snapshot.
      }
    }
    void tick()
    const handle = setInterval(() => void tick(), intervalMs)
    return () => {
      active = false
      clearInterval(handle)
    }
  }, [url, intervalMs])
  return [data, loaded] as const
}

/**
 * The trading terminal: the market (price + book) beside the broker's own area
 * (ticket + tabbed Holdings / Orders / Fills), with a symbol dropdown lifting
 * the active instrument into state so every market panel reads the same symbol.
 * Public market data is polled; private account data is polled here too and
 * degrades cleanly to the realtime push wired separately.
 */
export function Terminal({
  brokerId,
  symbols,
  defaultOwnerDocument,
  onSubmitOrder,
  onCancelOrder,
}: TerminalProps) {
  const [symbol, setSymbol] = useUrlState('symbol', symbols[0] ?? '')

  const [price, priceLoaded] = usePolledJson<PriceResponse>(`/api/stocks/${symbol}/price`)
  const [book, bookLoaded] = usePolledJson<OrderBookSnapshot>(`/api/stocks/${symbol}/book`)
  const [ordersData] = usePolledJson<OrdersResponse>(`/api/orders`)
  const [tradesData] = usePolledJson<TradesResponse>(`/api/trades`)
  const [balanceData, balanceLoaded] = usePolledJson<BalanceResponse>(
    `/api/brokers/${brokerId}/balance`,
  )

  // Delta is measured against the first price observed this session.
  const sessionOpen = useRef<number | null>(null)
  const priceCents = price?.price ?? null
  if (priceCents !== null && sessionOpen.current === null) {
    sessionOpen.current = priceCents
  }
  const deltaCents =
    priceCents !== null && sessionOpen.current !== null ? priceCents - sessionOpen.current : null

  const orders: OrderRow[] = (ordersData?.orders ?? []).map((o) => ({
    id: o.orderId,
    symbol: o.symbol,
    side: o.side,
    type: o.type,
    limitPriceCents: o.limitPriceCents,
    quantity: o.quantity,
    remaining: o.remaining,
    status: o.status,
  }))
  const fills: FillRow[] = (tradesData?.trades ?? []).map((t) => ({
    tradeId: t.tradeId,
    symbol: t.symbol,
    side: t.side,
    price: t.priceCents,
    quantity: t.quantity,
  }))
  const holdings: HoldingRow[] = balanceData?.positions ?? []
  const cashBalanceCents = balanceData?.cashBalanceCents ?? 0

  const submit =
    onSubmitOrder ??
    (async (payload: OrderTicketPayload) => {
      await submitOrderAction(payload)
    })
  const cancel =
    onCancelOrder ??
    ((orderId: string) => {
      void cancelOrderAction(orderId)
    })

  const emptyBook: OrderBookSnapshot = { symbol, bids: [], asks: [] }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Terminal</h1>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <section aria-label="Market" className="flex min-h-0 flex-col gap-4">
          <PriceDisplay
            symbol={symbol}
            symbols={symbols}
            onSymbolChange={setSymbol}
            priceCents={priceCents}
            deltaCents={deltaCents}
            loading={!priceLoaded}
          />
          <OrderBookPanel book={book ?? emptyBook} loading={!bookLoaded} />
        </section>

        <section aria-label="You" className="flex min-h-0 flex-col gap-4">
          <OrderTicket
            symbol={symbol}
            defaultOwnerDocument={defaultOwnerDocument}
            onSubmit={submit}
            bestBidCents={book?.bids[0]?.price ?? null}
            bestAskCents={book?.asks[0]?.price ?? null}
          />
          <YouPanel
            cashBalanceCents={cashBalanceCents}
            holdings={holdings}
            orders={orders}
            fills={fills}
            onCancel={cancel}
            loading={!balanceLoaded}
          />
        </section>
      </div>
    </div>
  )
}

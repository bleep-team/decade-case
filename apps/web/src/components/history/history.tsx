'use client'

import { useEffect, useState } from 'react'
import type { OrderSide, OrderStatus, OrderType } from '@decade/types'
import { useUrlState } from '@/lib/use-url-state'
import { HistoryView, type HistoryOrderRow, type HistoryTradeRow } from './history-view'

/** Rows per page; the list endpoints page with limit/offset. */
const PAGE_SIZE = 25

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
    createdAt: string
  }>
}

interface TradesResponse {
  trades: Array<{
    tradeId: string
    symbol: string
    side: OrderSide
    priceCents: number
    quantity: number
    executedAt: string
  }>
}

/** Fetch one page of a list endpoint; best-effort, returns [] on any failure. */
async function fetchPage<T>(url: string, key: 'orders' | 'trades'): Promise<T[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = (await res.json()) as Record<string, T[]>
    return json[key] ?? []
  } catch {
    return []
  }
}

/**
 * The History container: owns the shared page cursor, fetches the broker's
 * orders and trades for the current page from the REST list endpoints, maps the
 * API rows to view models, and renders {@link HistoryView}. `hasNext` is true
 * while either tab fills a full page, so the broker can always advance to look.
 */
export function History() {
  const [pageParam, setPageParam] = useUrlState('page', '1')
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1)
  const [orders, setOrders] = useState<HistoryOrderRow[]>([])
  const [trades, setTrades] = useState<HistoryTradeRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    const offset = (page - 1) * PAGE_SIZE
    const query = `limit=${PAGE_SIZE}&offset=${offset}`

    const load = async () => {
      const [orderRows, tradeRows] = await Promise.all([
        fetchPage<OrdersResponse['orders'][number]>(`/api/orders?${query}`, 'orders'),
        fetchPage<TradesResponse['trades'][number]>(`/api/trades?${query}`, 'trades'),
      ])
      if (!active) return
      setOrders(
        orderRows.map((o) => ({
          id: o.orderId,
          symbol: o.symbol,
          side: o.side,
          type: o.type,
          limitPriceCents: o.limitPriceCents,
          quantity: o.quantity,
          remaining: o.remaining,
          status: o.status,
          createdAt: o.createdAt,
        })),
      )
      setTrades(
        tradeRows.map((t) => ({
          tradeId: t.tradeId,
          symbol: t.symbol,
          side: t.side,
          priceCents: t.priceCents,
          quantity: t.quantity,
          executedAt: t.executedAt,
        })),
      )
      setLoaded(true)
    }

    void load()
    return () => {
      active = false
    }
  }, [page])

  const hasNext = orders.length >= PAGE_SIZE || trades.length >= PAGE_SIZE

  return (
    <HistoryView
      orders={orders}
      trades={trades}
      loading={!loaded}
      page={page}
      hasPrev={page > 1}
      hasNext={hasNext}
      onPrevPage={() => setPageParam(String(Math.max(1, page - 1)))}
      onNextPage={() => setPageParam(String(page + 1))}
    />
  )
}

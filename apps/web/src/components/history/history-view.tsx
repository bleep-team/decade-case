'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { OrderSide, OrderStatus, OrderType } from '@decade/types'
import { formatUsd } from '@decade/types'
import { Badge } from '@decade/ui/components/badge'
import { Button } from '@decade/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@decade/ui/components/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@decade/ui/components/tabs'
import { formatTime } from '@/lib/format-time'
import { useUrlState } from '@/lib/use-url-state'

/** One of the broker's orders, as the history page lists it. */
export interface HistoryOrderRow {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  limitPriceCents: number | null
  quantity: number
  remaining: number
  status: OrderStatus
  createdAt: string
}

/** One of the broker's trades, as the history page lists it. */
export interface HistoryTradeRow {
  tradeId: string
  symbol: string
  side: OrderSide
  priceCents: number
  quantity: number
  executedAt: string
}

export interface HistoryViewProps {
  orders: HistoryOrderRow[]
  trades: HistoryTradeRow[]
  /** Current 1-based page number, shown between the pagination controls. */
  page: number
  /** Whether a previous page exists. */
  hasPrev: boolean
  /** Whether a next page exists. */
  hasNext: boolean
  onPrevPage: () => void
  onNextPage: () => void
  /** Initial tab; defaults to Orders. */
  defaultTab?: 'orders' | 'trades'
}

/** Previous / page / Next controls shared by both tabs. */
function PaginationControls({
  page,
  hasPrev,
  hasNext,
  onPrevPage,
  onNextPage,
}: Pick<HistoryViewProps, 'page' | 'hasPrev' | 'hasNext' | 'onPrevPage' | 'onNextPage'>) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <Button
        size="sm"
        variant="outline"
        aria-label="Previous page"
        disabled={!hasPrev}
        onClick={onPrevPage}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Previous
      </Button>
      <span className="px-2 text-sm tabular-nums text-muted-foreground" aria-live="polite">
        Page {page}
      </span>
      <Button
        size="sm"
        variant="outline"
        aria-label="Next page"
        disabled={!hasNext}
        onClick={onNextPage}
      >
        Next
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

/**
 * The History page body: the broker's full record as tabbed Orders / Trades
 * tables, each with shared pagination controls. Purely presentational — data and
 * paging callbacks come in as props, so the container owns fetching and the page
 * cursor.
 */
export function HistoryView({
  orders,
  trades,
  page,
  hasPrev,
  hasNext,
  onPrevPage,
  onNextPage,
  defaultTab = 'orders',
}: HistoryViewProps) {
  const [tab, setTab] = useUrlState('tab', defaultTab)
  const pagination = (
    <PaginationControls
      page={page}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPrevPage={onPrevPage}
      onNextPage={onNextPage}
    />
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id}</TableCell>
                      <TableCell>{o.symbol}</TableCell>
                      <TableCell className="uppercase">{o.side}</TableCell>
                      <TableCell className="font-mono">
                        {o.limitPriceCents != null ? formatUsd(o.limitPriceCents) : 'MKT'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{o.remaining}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{o.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatTime(o.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination}
          </TabsContent>

          <TabsContent value="trades">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trade</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Executed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No trades yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  trades.map((t) => (
                    <TableRow key={t.tradeId}>
                      <TableCell className="font-mono text-xs">{t.tradeId}</TableCell>
                      <TableCell>{t.symbol}</TableCell>
                      <TableCell className="uppercase">{t.side}</TableCell>
                      <TableCell className="font-mono">{formatUsd(t.priceCents)}</TableCell>
                      <TableCell className="text-right font-mono">{t.quantity}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatTime(t.executedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

'use client'

import { ChevronLeft, ChevronRight, Receipt, ScrollText, type LucideIcon } from 'lucide-react'
import type { OrderSide, OrderStatus, OrderType } from '@decade/types'
import { formatUsd } from '@decade/types'
import { Badge } from '@decade/ui/components/badge'
import { Button } from '@decade/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@decade/ui/components/empty'
import { Skeleton } from '@decade/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@decade/ui/components/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@decade/ui/components/tabs'
import { SideLabel } from '@/components/side-label'
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
  /** First-paint state: show skeleton rows instead of an empty record. */
  loading?: boolean
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

/** Placeholder rows shown while the first page loads. */
function HistorySkeleton() {
  return (
    <div className="space-y-2 py-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

/** A centered empty state for a history tab with no rows on this page. */
function HistoryEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Empty className="border-0 py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
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
  loading = false,
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
            {loading ? (
              <HistorySkeleton />
            ) : orders.length === 0 ? (
              <HistoryEmpty
                icon={ScrollText}
                title="No orders yet"
                description="Orders you submit from the terminal or API are recorded here."
              />
            ) : (
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
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id}</TableCell>
                      <TableCell>{o.symbol}</TableCell>
                      <TableCell>
                        <SideLabel side={o.side} />
                      </TableCell>
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
                  ))}
                </TableBody>
              </Table>
            )}
            {pagination}
          </TabsContent>

          <TabsContent value="trades">
            {loading ? (
              <HistorySkeleton />
            ) : trades.length === 0 ? (
              <HistoryEmpty
                icon={Receipt}
                title="No trades yet"
                description="Executions against your orders are recorded here."
              />
            ) : (
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
                  {trades.map((t) => (
                    <TableRow key={t.tradeId}>
                      <TableCell className="font-mono text-xs">{t.tradeId}</TableCell>
                      <TableCell>{t.symbol}</TableCell>
                      <TableCell>
                        <SideLabel side={t.side} />
                      </TableCell>
                      <TableCell className="font-mono">{formatUsd(t.priceCents)}</TableCell>
                      <TableCell className="text-right font-mono">{t.quantity}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatTime(t.executedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {pagination}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

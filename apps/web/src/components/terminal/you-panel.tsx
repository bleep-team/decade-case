'use client'

import { Receipt, ScrollText, Wallet, X, type LucideIcon } from 'lucide-react'
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
import { ScrollArea } from '@decade/ui/components/scroll-area'
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
import { useUrlState } from '@/lib/use-url-state'

/** A signed share position the broker holds. */
export interface HoldingRow {
  symbol: string
  quantity: number
}

/** One of the broker's orders, as the terminal lists it. */
export interface OrderRow {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  limitPriceCents: number | null
  quantity: number
  remaining: number
  status: OrderStatus
}

/** One of the broker's executions. */
export interface FillRow {
  tradeId: string
  symbol: string
  side: OrderSide
  price: number
  quantity: number
}

export interface YouPanelProps {
  /** The broker's settled cash balance, in integer cents. */
  cashBalanceCents: number
  holdings: HoldingRow[]
  orders: OrderRow[]
  fills: FillRow[]
  /** Called with the order id when a cancellable order's cancel control is used. */
  onCancel: (orderId: string) => void | Promise<void>
  /** Initial tab; defaults to Holdings. */
  defaultTab?: 'holdings' | 'orders' | 'fills'
  /** First-paint state: show skeletons instead of a (misleading) empty account. */
  loading?: boolean
}

/** Open and partially-filled orders are the only cancellable states. */
function isCancellable(status: OrderStatus): boolean {
  return status === 'open' || status === 'partially_filled'
}

/** Placeholder rows shown while the account first loads. */
function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full" />
      ))}
    </div>
  )
}

/** A compact, centered empty state that fills the tab's flex space. */
function TabEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Empty className="h-full border-0 p-6">
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

/**
 * The broker's own area: tabbed Holdings / Orders / Fills, all driven by data
 * passed in. Open and partially-filled orders carry a cancel control that calls
 * `onCancel`; terminal (filled / cancelled / expired / rejected) orders do not.
 */
export function YouPanel({
  cashBalanceCents,
  holdings,
  orders,
  fills,
  onCancel,
  defaultTab = 'holdings',
  loading = false,
}: YouPanelProps) {
  const [tab, setTab] = useUrlState('tab', defaultTab)
  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>You</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div
          className="mb-4 flex items-baseline justify-between border-b border-border pb-3"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="text-sm text-muted-foreground">Cash</span>
          {loading ? (
            <Skeleton className="h-7 w-32" />
          ) : (
            <span className="font-mono text-lg font-medium tabular-nums text-foreground">
              {formatUsd(cashBalanceCents)}
            </span>
          )}
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="fills">Fills</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="min-h-0 flex-1">
            {loading ? (
              <TableSkeleton />
            ) : holdings.length === 0 ? (
              <TabEmpty
                icon={Wallet}
                title="No holdings yet"
                description="Positions you build from filled orders show up here."
              />
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((h) => (
                      <TableRow key={h.symbol}>
                        <TableCell>{h.symbol}</TableCell>
                        <TableCell className="text-right font-mono">{h.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="orders" className="min-h-0 flex-1">
            {loading ? (
              <TableSkeleton />
            ) : orders.length === 0 ? (
              <TabEmpty
                icon={ScrollText}
                title="No orders yet"
                description="Submit a bid or ask and your working orders appear here."
              />
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Side</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="uppercase">{o.side}</TableCell>
                        <TableCell className="font-mono">
                          {o.limitPriceCents != null ? formatUsd(o.limitPriceCents) : 'MKT'}
                        </TableCell>
                        <TableCell className="text-right font-mono">{o.remaining}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancellable(o.status) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Cancel order ${o.id}`}
                              onClick={() => void onCancel(o.id)}
                            >
                              <X className="size-4" aria-hidden="true" />
                              Cancel
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="fills" className="min-h-0 flex-1">
            {loading ? (
              <TableSkeleton />
            ) : fills.length === 0 ? (
              <TabEmpty
                icon={Receipt}
                title="No fills yet"
                description="Each execution against your orders is recorded here."
              />
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Side</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fills.map((f) => (
                      <TableRow key={f.tradeId}>
                        <TableCell className="uppercase">{f.side}</TableCell>
                        <TableCell className="font-mono">{formatUsd(f.price)}</TableCell>
                        <TableCell className="text-right font-mono">{f.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

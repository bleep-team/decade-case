'use client'

import { X } from 'lucide-react'
import type { OrderSide, OrderStatus, OrderType } from '@decade/types'
import { formatUsd } from '@decade/types'
import { Badge } from '@decade/ui/components/badge'
import { Button } from '@decade/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import { ScrollArea } from '@decade/ui/components/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@decade/ui/components/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@decade/ui/components/tabs'

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
}

/** Open and partially-filled orders are the only cancellable states. */
function isCancellable(status: OrderStatus): boolean {
  return status === 'open' || status === 'partially_filled'
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
}: YouPanelProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>You</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
          <span className="text-sm text-muted-foreground">Cash</span>
          <span className="font-mono text-lg font-medium text-foreground">
            {formatUsd(cashBalanceCents)}
          </span>
        </div>
        <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="fills">Fills</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No holdings yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    holdings.map((h) => (
                      <TableRow key={h.symbol}>
                        <TableCell>{h.symbol}</TableCell>
                        <TableCell className="text-right font-mono">{h.quantity}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="orders" className="min-h-0 flex-1">
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
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
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
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="fills" className="min-h-0 flex-1">
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
                  {fills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No fills yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fills.map((f) => (
                      <TableRow key={f.tradeId}>
                        <TableCell className="uppercase">{f.side}</TableCell>
                        <TableCell className="font-mono">{formatUsd(f.price)}</TableCell>
                        <TableCell className="text-right font-mono">{f.quantity}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

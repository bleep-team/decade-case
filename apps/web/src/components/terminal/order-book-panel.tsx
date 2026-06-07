import type { OrderBookLevel, OrderBookSnapshot } from '@decade/types'
import { formatUsd } from '@decade/types'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import { ScrollArea } from '@decade/ui/components/scroll-area'
import { Skeleton } from '@decade/ui/components/skeleton'
import { cn } from '@decade/ui/lib/utils'
import { InfoTip } from './info-tip'

export interface OrderBookPanelProps {
  book: OrderBookSnapshot
  /** First-paint state: show skeleton rows instead of an empty book. */
  loading?: boolean
}

/**
 * The order book: asks above, bids below, with a spread row between. Each data
 * row carries a thin side marker — `--loss` for asks (sellers), `--gain` for
 * bids (buyers) — so the two sides read at a glance. Asks are rendered
 * descending so the best (lowest) ask sits just above the spread; bids descend
 * so the best (highest) bid sits just below it.
 */
export function OrderBookPanel({ book, loading = false }: OrderBookPanelProps) {
  const asksHighToLow = [...book.asks].reverse()
  const bestAsk = book.asks[0]?.price ?? null
  const bestBid = book.bids[0]?.price ?? null
  const spread = bestAsk !== null && bestBid !== null ? bestAsk - bestBid : null

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>Order book</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col text-sm">
          <div className="mb-1 grid grid-cols-3 text-xs text-muted-foreground">
            <span>Price</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Orders</span>
          </div>

          {loading ? (
            <div className="min-h-0 flex-1 space-y-1.5 pt-1" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-[2px] bg-loss" aria-hidden="true" />
                Asks
              </div>
              <div className="space-y-px">
                {asksHighToLow.map((level) => (
                  <BookRow key={`ask-${level.price}`} level={level} side="ask" />
                ))}
              </div>

              <div
                data-testid="book-spread"
                className="my-1 flex items-center justify-between border-y border-border py-1 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  Spread
                  <InfoTip label="More information">
                    The gap between the best (lowest) ask and the best (highest) bid.
                  </InfoTip>
                </span>
                <span className="font-mono text-foreground">
                  {spread !== null ? formatUsd(spread) : '—'}
                </span>
              </div>

              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-[2px] bg-gain" aria-hidden="true" />
                Bids
              </div>
              <div className="space-y-px">
                {book.bids.map((level) => (
                  <BookRow key={`bid-${level.price}`} level={level} side="bid" />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function BookRow({ level, side }: { level: OrderBookLevel; side: 'ask' | 'bid' }) {
  return (
    <div
      data-side={side}
      data-price={level.price}
      className={cn(
        'grid grid-cols-3 border-l-2 py-0.5 pl-2 font-mono',
        side === 'ask' ? 'border-l-loss text-loss' : 'border-l-gain text-gain',
      )}
    >
      <span>{formatUsd(level.price)}</span>
      <span className="text-right text-foreground">{level.quantity}</span>
      <span className="text-right text-muted-foreground">{level.orderCount}</span>
    </div>
  )
}

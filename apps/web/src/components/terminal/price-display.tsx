import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatUsd } from '@decade/types'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import { cn } from '@decade/ui/lib/utils'

export interface PriceDisplayProps {
  symbol: string
  /** Current price in integer cents, or null when the market is empty. */
  priceCents: number | null
  /** Signed change in cents versus the session reference, or null. */
  deltaCents: number | null
}

/**
 * The current price and its delta. The price itself stays neutral (foreground);
 * the delta carries the `--gain` / `--loss` data tokens and a trend icon so a
 * rising or falling market reads at a glance.
 */
export function PriceDisplay({ symbol, priceCents, deltaCents }: PriceDisplayProps) {
  const direction =
    deltaCents == null ? 'flat' : deltaCents > 0 ? 'up' : deltaCents < 0 ? 'down' : 'flat'
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus

  return (
    <Card>
      <CardHeader>
        <CardTitle>{symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <span
            data-testid="price-value"
            className="font-mono text-3xl font-medium text-foreground"
          >
            {priceCents !== null ? formatUsd(priceCents) : '—'}
          </span>
          <span
            data-testid="price-delta"
            className={cn(
              'flex items-center gap-1 font-mono text-sm',
              direction === 'up' && 'text-gain',
              direction === 'down' && 'text-loss',
              direction === 'flat' && 'text-muted-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {deltaCents != null ? (
              <>
                {deltaCents > 0 ? '+' : deltaCents < 0 ? '-' : ''}
                {formatUsd(Math.abs(deltaCents))}
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

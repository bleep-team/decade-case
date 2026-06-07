import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatUsd } from '@decade/types'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import { cn } from '@decade/ui/lib/utils'
import { InfoTip } from './info-tip'

export interface PriceDisplayProps {
  symbol: string
  /** Current price in integer cents, or null when the market is empty. */
  priceCents: number | null
  /** Signed change in cents versus the session reference, or null. */
  deltaCents: number | null
}

type Direction = 'up' | 'down' | 'flat'

const TREND_ICON: Record<Direction, typeof Minus> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}
const DELTA_SIGN: Record<Direction, string> = { up: '+', down: '-', flat: '' }

/** A null or zero delta reads as flat; otherwise the sign picks the direction. */
function priceDirection(deltaCents: number | null): Direction {
  if (deltaCents == null || deltaCents === 0) return 'flat'
  return deltaCents > 0 ? 'up' : 'down'
}

/**
 * The current price and its delta. The price itself stays neutral (foreground);
 * the delta carries the `--gain` / `--loss` data tokens and a trend icon so a
 * rising or falling market reads at a glance.
 */
export function PriceDisplay({ symbol, priceCents, deltaCents }: PriceDisplayProps) {
  const direction = priceDirection(deltaCents)
  const Icon = TREND_ICON[direction]

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
            {deltaCents != null
              ? `${DELTA_SIGN[direction]}${formatUsd(Math.abs(deltaCents))}`
              : '—'}
          </span>
          <InfoTip label="More information">
            The midpoint of the best bid and ask. The change is versus the first price seen this
            session.
          </InfoTip>
        </div>
      </CardContent>
    </Card>
  )
}

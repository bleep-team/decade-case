import type { OrderSide } from '@decade/types'
import { cn } from '@decade/ui/lib/utils'

/**
 * A trade side rendered in the order book's color language: a bid (buyer) reads
 * `--gain` green, an ask (seller) `--loss` red — the same mapping as the book's
 * side markers, so "which side" is legible at a glance across the terminal and
 * history. The uppercase label always carries the meaning; color is redundant
 * reinforcement, never the only signal.
 */
export function SideLabel({ side, className }: { side: OrderSide; className?: string }) {
  return (
    <span
      className={cn('font-medium uppercase', side === 'bid' ? 'text-gain' : 'text-loss', className)}
    >
      {side}
    </span>
  )
}

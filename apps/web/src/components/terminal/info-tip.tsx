'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@decade/ui/components/tooltip'

export interface InfoTipProps {
  /** Accessible name for the trigger; describe what the tip explains. */
  label: string
  /** The tip content shown on hover/focus. */
  children: ReactNode
}

/**
 * A small info icon that reveals an explanatory tooltip on hover or keyboard
 * focus — for labelling controls and figures whose meaning isn't self-evident.
 * Self-contained (carries its own provider) so it works anywhere, including in
 * isolated component tests.
 */
export function InfoTip({ label, children }: InfoTipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-pretty">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

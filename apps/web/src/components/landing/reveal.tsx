'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@decade/ui/lib/utils'

/**
 * Section reveal: fades and rises into place as it enters the viewport, on the
 * brand easing curve. Pairs with the Lenis smooth-scroll provider for a buttery
 * feel. `delay` is in milliseconds (kept for call-site compatibility). Honors
 * prefers-reduced-motion via motion's reduced-motion handling.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.44, 0, 0.56, 1], delay: delay / 1000 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

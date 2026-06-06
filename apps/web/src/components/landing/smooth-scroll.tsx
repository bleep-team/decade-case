'use client'

import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'

/**
 * Momentum-based smooth-scroll provider (Lenis). Mount once around the page.
 * Lenis drives scroll via a requestAnimationFrame loop with an exponential
 * ease-out. Add `data-lenis-prevent` to any descendant that needs native
 * scroll (modals, inner scroll areas).
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      anchors: true,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}

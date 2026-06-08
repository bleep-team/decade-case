'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/** The app shell's scroll container (see `app/app/layout.tsx`). */
const SCROLLER_ID = 'main-content'

/**
 * A floating "back to top" control for the long How-it-works page. It watches
 * the app shell's scroll container and appears once you have scrolled past a
 * screenful, then scrolls back to the top (honoring reduced motion). Only in the
 * DOM while useful, so it never sits in the tab order when hidden.
 */
export function ScrollTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const scroller = document.getElementById(SCROLLER_ID)
    if (!scroller) return
    const onScroll = () => setVisible(scroller.scrollTop > 600)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  const toTop = () => {
    const scroller = document.getElementById(SCROLLER_ID)
    if (!scroller) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-40 flex size-10 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-lg backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
    >
      <ArrowUp className="size-4" aria-hidden="true" />
    </button>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseCopy {
  /** True from a successful copy until `resetMs` elapses. */
  copied: boolean
  /** Write `text` to the clipboard and flip `copied` true (auto-reverts). */
  copy: (text: string) => Promise<void>
  /** Force `copied` back to false now (e.g. when the copyable value changes). */
  reset: () => void
}

/**
 * Clipboard-copy state that reverts on its own. `copied` flips true on a
 * successful copy and back to false after `resetMs`, so a "Copied" affordance
 * never sticks. The timer is cleared on re-copy and on unmount, so a fast
 * double-click or navigating away can't leave it stuck or fire after teardown.
 */
export function useCopy(resetMs = 2000): UseCopy {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clear()
    setCopied(false)
  }, [clear])

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard?.writeText(text)
      setCopied(true)
      clear()
      timer.current = setTimeout(() => setCopied(false), resetMs)
    },
    [clear, resetMs],
  )

  useEffect(() => clear, [clear])

  return { copied, copy, reset }
}

'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Client-only URL query-string state for shareable, back-button-friendly UI state
 * (active symbol, tab, page) without server re-renders. Seeds from the current
 * URL on mount (so initial SSR markup matches the fallback — hydration-safe) and
 * writes back with `history.replaceState`, which updates the address bar without
 * triggering a Next navigation or data refetch.
 */
export function useUrlState(
  key: string,
  fallback: string,
): readonly [string, (value: string) => void] {
  const [value, setValue] = useState(fallback)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(key)
    if (fromUrl !== null) setValue(fromUrl)
  }, [key])

  const set = useCallback(
    (next: string) => {
      setValue(next)
      const params = new URLSearchParams(window.location.search)
      params.set(key, next)
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    },
    [key],
  )

  return [value, set] as const
}

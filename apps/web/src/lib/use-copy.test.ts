import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCopy } from './use-copy'

describe('useCopy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // navigator.clipboard is a getter-only property in happy-dom; redefine it.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('flips copied true on copy, then reverts after the timeout', async () => {
    const { result } = renderHook(() => useCopy(2000))
    expect(result.current.copied).toBe(false)

    await act(async () => {
      await result.current.copy('hello')
    })
    expect(result.current.copied).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.copied).toBe(false)
  })

  it('reset() clears the copied state immediately', async () => {
    const { result } = renderHook(() => useCopy())
    await act(async () => {
      await result.current.copy('x')
    })
    expect(result.current.copied).toBe(true)

    act(() => {
      result.current.reset()
    })
    expect(result.current.copied).toBe(false)
  })
})

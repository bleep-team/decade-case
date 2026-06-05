import { describe, expect, it, vi } from 'vitest'
import { createLogger } from './logger.js'
import type { LogEntry, LogTransport } from './types.js'

function captureTransport(): { transport: LogTransport; entries: LogEntry[] } {
  const entries: LogEntry[] = []
  return {
    entries,
    transport: { send: (entry) => void entries.push(entry) },
  }
}

describe('createLogger', () => {
  it('emits an entry with the level, message, and a timestamp', () => {
    const { transport, entries } = captureTransport()
    const logger = createLogger({}, transport)

    logger.info('order accepted')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ level: 'info', message: 'order accepted' })
    expect(entries[0]?.timestamp).toBeTypeOf('string')
  })

  it('merges the bound context into every entry', () => {
    const { transport, entries } = captureTransport()
    const logger = createLogger({ brokerId: 'brk_1', symbol: 'AAPL' }, transport)

    logger.warn('thin book')

    expect(entries[0]).toMatchObject({ brokerId: 'brk_1', symbol: 'AAPL' })
  })

  it('forwards per-call metadata', () => {
    const { transport, entries } = captureTransport()
    const logger = createLogger({}, transport)

    logger.error('match failed', { orderId: 'ord_9', reason: 'expired' })

    expect(entries[0]).toMatchObject({ level: 'error', orderId: 'ord_9', reason: 'expired' })
  })

  it('routes each level to its own method name', () => {
    const send = vi.fn()
    const logger = createLogger({}, { send })

    logger.info('a')
    logger.warn('b')
    logger.error('c')

    expect(send).toHaveBeenCalledTimes(3)
  })
})

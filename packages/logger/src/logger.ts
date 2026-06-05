import type { LogContext, LogEntry, LogTransport } from './types.js'

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export function createLogger(context: LogContext, transport: LogTransport): Logger {
  function log(level: LogEntry['level'], message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      ...meta,
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    if (context.requestId !== undefined) {
      entry.requestId = context.requestId
    }
    if (context.brokerId !== undefined) {
      entry.brokerId = context.brokerId
    }
    if (context.orderId !== undefined) {
      entry.orderId = context.orderId
    }
    if (context.symbol !== undefined) {
      entry.symbol = context.symbol
    }

    transport.send(entry)
  }

  return {
    info(message: string, meta?: Record<string, unknown>): void {
      log('info', message, meta)
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      log('warn', message, meta)
    },
    error(message: string, meta?: Record<string, unknown>): void {
      log('error', message, meta)
    },
  }
}

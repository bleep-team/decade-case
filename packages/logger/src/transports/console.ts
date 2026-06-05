import type { LogEntry, LogTransport } from '../types.js'

export function createConsoleTransport(): LogTransport {
  return {
    send(entry: LogEntry): void {
      const { level, message, timestamp, ...rest } = entry
      const prefix = `[${timestamp}] ${level.toUpperCase()}`
      const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : ''

      switch (level) {
        case 'info':
          console.info(`${prefix}: ${message}${extra}`)
          break
        case 'warn':
          console.warn(`${prefix}: ${message}${extra}`)
          break
        case 'error':
          console.error(`${prefix}: ${message}${extra}`)
          break
      }
    },
  }
}

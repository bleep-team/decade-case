export interface LogContext {
  requestId?: string
  brokerId?: string
  orderId?: string
  symbol?: string
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  requestId?: string
  brokerId?: string
  orderId?: string
  symbol?: string
  [key: string]: unknown
}

export interface LogTransport {
  send(entry: LogEntry): void | Promise<void>
}

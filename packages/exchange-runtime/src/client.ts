import { EventSchemas, Inngest } from 'inngest'
import { realtimeMiddleware } from '@inngest/realtime/middleware'
import type { ExchangeEvents } from './events.js'

// `realtimeMiddleware()` injects `publish` into every function's context so the
// runtime can push private per-broker updates (fills, order status, balance) to
// Inngest Realtime channels. Public market data stays on REST polling.
export const inngest = new Inngest({
  id: 'decade-exchange',
  schemas: new EventSchemas().fromRecord<ExchangeEvents>(),
  middleware: [realtimeMiddleware()],
})

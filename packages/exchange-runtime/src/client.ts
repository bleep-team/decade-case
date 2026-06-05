import { EventSchemas, Inngest } from 'inngest'
import type { ExchangeEvents } from './events.js'

export const inngest = new Inngest({
  id: 'decade-exchange',
  schemas: new EventSchemas().fromRecord<ExchangeEvents>(),
})

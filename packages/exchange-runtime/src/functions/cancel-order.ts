import { inngest } from '../client.js'
import { getDb } from '../db.js'
import { runCancel } from '../run-cancel.js'

export const cancelOrderFn = inngest.createFunction(
  {
    id: 'cancel-order',
    // Serialize on the order's symbol with the SAME key matching uses, so a
    // cancel and a fill for one symbol can never run concurrently: the cancel
    // either wins the race (the order is still resting and becomes `cancelled`)
    // or loses it (the order already filled and the cancel is a no-op).
    concurrency: { key: 'event.data.symbol', limit: 1 },
    retries: 3,
  },
  { event: 'order/cancel-requested' },
  async ({ event, step }) => {
    const { orderId } = event.data

    const order = await step.run('cancel', () => runCancel(getDb(), orderId))

    return { orderId, status: order?.status ?? null }
  },
)

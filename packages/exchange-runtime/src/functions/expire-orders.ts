import { and, inArray, isNotNull, lt } from 'drizzle-orm'
import { orders } from '@decade/db'
import { inngest } from '../client.js'
import { getDb } from '../db.js'

export const expireOrdersFn = inngest.createFunction(
  { id: 'expire-orders', retries: 2 },
  { cron: '* * * * *' },
  async ({ step }) => {
    const expired = await step.run('sweep-expired', async () => {
      const db = getDb()
      const now = new Date()
      const swept = await db
        .update(orders)
        .set({ status: 'expired', updatedAt: now })
        .where(
          and(
            inArray(orders.status, ['open', 'partially_filled']),
            isNotNull(orders.expiresAt),
            lt(orders.expiresAt, now),
          ),
        )
        .returning({ id: orders.id })
      return swept.length
    })

    return { expired }
  },
)

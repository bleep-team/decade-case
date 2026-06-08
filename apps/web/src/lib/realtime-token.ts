import { getSubscriptionToken } from '@inngest/realtime'
import { resolveOrCreateBroker, UnauthorizedError } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { brokerChannel, getDb, inngest } from '@decade/exchange-runtime'

/**
 * Mint an Inngest Realtime subscription token for a broker's private channel,
 * authorized against the Clerk session. The caller may only subscribe to its own
 * channel: a `requestedBrokerId` that is not the session broker's is refused with
 * {@link UnauthorizedError}, never handed a token. The minted token is scoped to
 * `broker:<id>` / `updates` only.
 */
export async function mintBrokerSubscriptionToken(requestedBrokerId: string) {
  const userId = await requireUserId()
  const broker = await resolveOrCreateBroker(getDb(), userId)

  if (broker.id !== requestedBrokerId) {
    throw new UnauthorizedError("cannot subscribe to another broker's channel")
  }

  return getSubscriptionToken(inngest, {
    channel: brokerChannel(broker.id),
    topics: ['updates'],
  })
}

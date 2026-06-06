'use server'

import { mintBrokerSubscriptionToken } from '@/lib/realtime-token'

/**
 * Server action the terminal calls to obtain a subscription token for its own
 * broker channel. Thin wrapper over {@link mintBrokerSubscriptionToken}, which
 * authorizes the request against the Clerk session.
 */
export async function subscribeToBrokerChannel(brokerId: string) {
  return mintBrokerSubscriptionToken(brokerId)
}

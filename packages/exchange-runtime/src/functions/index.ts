import { matchOrderFn } from './match-order.js'
import { cancelOrderFn } from './cancel-order.js'
import { expireOrdersFn } from './expire-orders.js'
import { deliverWebhookFn } from './deliver-webhook.js'
import { marketMakerFn, marketMakerCronFn } from './market-maker.js'

export {
  matchOrderFn,
  cancelOrderFn,
  expireOrdersFn,
  deliverWebhookFn,
  marketMakerFn,
  marketMakerCronFn,
}

/** Every Inngest function the app should register at `/api/inngest`. */
export const functions = [
  matchOrderFn,
  cancelOrderFn,
  expireOrdersFn,
  deliverWebhookFn,
  marketMakerFn,
  marketMakerCronFn,
]

import { matchOrderFn } from './match-order.js'
import { cancelOrderFn } from './cancel-order.js'
import { expireOrdersFn } from './expire-orders.js'
import { deliverWebhookFn } from './deliver-webhook.js'

export { matchOrderFn, cancelOrderFn, expireOrdersFn, deliverWebhookFn }

/** Every Inngest function the app should register at `/api/inngest`. */
export const functions = [matchOrderFn, cancelOrderFn, expireOrdersFn, deliverWebhookFn]

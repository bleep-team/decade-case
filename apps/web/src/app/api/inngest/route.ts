import { serve } from 'inngest/next'
import { functions, inngest } from '@decade/exchange-runtime'

// Inngest discovers and invokes the exchange jobs (matching, expiry, webhooks)
// through this endpoint — both in cloud and against the local dev server.
export const { GET, POST, PUT } = serve({ client: inngest, functions })

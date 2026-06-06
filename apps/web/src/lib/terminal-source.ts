import type { BrokerUpdate } from '@decade/exchange-runtime'

/**
 * A source of private {@link BrokerUpdate}s feeding the terminal reducer. The
 * terminal is agnostic to *how* updates arrive: a live Inngest Realtime
 * subscription or plain REST polling both implement this one interface, so the
 * UI degrades cleanly to all-polling when realtime is unavailable.
 */
export interface TerminalSource {
  /** Begin emitting updates to `onUpdate`; returns a function that stops it. */
  start(onUpdate: (update: BrokerUpdate) => void): () => void
}

/**
 * REST-polling source. Re-fetches a snapshot on an interval and emits it as a
 * {@link BrokerUpdate}; `fetchUpdate` returns `null` when there is nothing new.
 * Needs no live realtime connection — this is the all-polling fallback.
 */
export function createPollingSource(
  fetchUpdate: () => Promise<BrokerUpdate | null>,
  intervalMs = 1000,
): TerminalSource {
  return {
    start(onUpdate) {
      let stopped = false
      const tick = async () => {
        const update = await fetchUpdate()
        if (!stopped && update) onUpdate(update)
      }
      void tick()
      const handle = setInterval(() => void tick(), intervalMs)
      return () => {
        stopped = true
        clearInterval(handle)
      }
    },
  }
}

/**
 * Realtime source. Adapts an async stream of envelopes (what `subscribe()`
 * yields once a server-minted token authorizes the broker's channel) into the
 * same {@link TerminalSource} interface the polling source satisfies.
 */
export function createRealtimeSource(
  connect: () => Promise<AsyncIterable<{ data: BrokerUpdate }>>,
): TerminalSource {
  return {
    start(onUpdate) {
      let stopped = false
      void (async () => {
        const stream = await connect()
        for await (const message of stream) {
          if (stopped) break
          onUpdate(message.data)
        }
      })()
      return () => {
        stopped = true
      }
    },
  }
}

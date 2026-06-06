import type { BrokerUpdate, FillInfo, OrderSnapshot } from '@decade/exchange-runtime'

/**
 * The slice of terminal state driven by private realtime updates: the broker's
 * orders, its fills, its cash balance, and its positions. Public market data
 * (book, price) lives elsewhere and is polled, not reduced here.
 */
export interface TerminalState {
  /** Latest snapshot of each of the broker's orders, keyed by order id. */
  orders: Record<string, OrderSnapshot>
  /** The broker's fills, most recent last. */
  fills: FillInfo[]
  /** Cash balance in integer cents. */
  balanceCents: number
  /** Signed share positions, keyed by symbol. */
  positions: Record<string, number>
}

/** Empty terminal state — the starting point before any update arrives. */
export const initialTerminalState: TerminalState = {
  orders: {},
  fills: [],
  balanceCents: 0,
  positions: {},
}

/**
 * Apply one inbound {@link BrokerUpdate} envelope to terminal state. Pure and
 * total: it overwrites the affected order's snapshot, appends the update's
 * fills, refreshes the balance, and records the position. A state-machine
 * transition — the same envelope always maps a given state to the same next one.
 */
export function terminalReducer(state: TerminalState, update: BrokerUpdate): TerminalState {
  const positions = update.position
    ? { ...state.positions, [update.position.symbol]: update.position.quantity }
    : state.positions

  return {
    orders: { ...state.orders, [update.order.id]: update.order },
    fills: [...state.fills, ...update.fills],
    balanceCents: update.balanceCents,
    positions,
  }
}

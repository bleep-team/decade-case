import { asc } from 'drizzle-orm'
import { resolveOrCreateBroker } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { stocks } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { Terminal } from '@/components/terminal/terminal'

export const dynamic = 'force-dynamic'

/** A default demo customer document, pre-filled in the ticket and editable. */
const DEFAULT_OWNER_DOCUMENT = 'DEMO-0001'

/** Fallback symbols if the stocks table has not been seeded. */
const FALLBACK_SYMBOLS = ['AAPL', 'TSLA', 'AMZN', 'GOOGL', 'MSFT']

/** The trading terminal — the app's primary surface for the signed-in broker. */
export default async function TerminalPage() {
  const userId = await requireUserId()
  const db = getDb()
  const broker = await resolveOrCreateBroker(db, userId)

  const rows = await db.select({ symbol: stocks.symbol }).from(stocks).orderBy(asc(stocks.symbol))
  const symbols = rows.length > 0 ? rows.map((row) => row.symbol) : FALLBACK_SYMBOLS

  return (
    <Terminal
      brokerId={broker.id}
      symbols={symbols}
      defaultOwnerDocument={DEFAULT_OWNER_DOCUMENT}
    />
  )
}

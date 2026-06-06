import { cn } from '@decade/ui/lib/utils'

/* Syntax-color spans (these are editor syntax colors, not UI accents). */
const K = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#0099ff]">{children}</span>
)
const F = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#d5ff45]">{children}</span>
)
const S = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#f0a868]">{children}</span>
)
const C = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white/35">{children}</span>
)

const CHROME =
  'overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/50'

/** Realistic editor card: Explorer sidebar + file tabs + line-numbered code. */
export function EditorMock({ fontClass, className }: { fontClass?: string; className?: string }) {
  const lines = [
    <>
      <K>export function</K> <F>matchOrder</F>(book: OrderBook, incoming: Order) {'{'}
    </>,
    <>
      {'  '}
      <K>const</K> trades: Trade[] = []
    </>,
    <>
      {'  '}
      <K>while</K> (incoming.remaining {'>'} <S>0</S>) {'{'}
    </>,
    <>
      {'    '}
      <K>const</K> resting = book.<F>bestMatch</F>(incoming)
    </>,
    <>
      {'    '}
      <K>if</K> (!resting) <K>break</K>
    </>,
    <>
      {'    '}
      <C>// execution happens at the seller&rsquo;s price</C>
    </>,
    <>
      {'    '}
      <K>const</K> price = resting.price
    </>,
    <>
      {'    '}trades.<F>push</F>(<F>fill</F>(incoming, resting, price))
    </>,
    <>{'  }'}</>,
    <>
      {'  '}
      <K>return</K> trades
    </>,
    <>{'}'}</>,
  ]

  return (
    <div className={cn(CHROME, className)}>
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <Tab active>match.ts</Tab>
        <Tab>book.ts</Tab>
        <Tab>price.ts</Tab>
      </div>
      <div className={cn('flex text-[12.5px] leading-[1.7]', fontClass)} translate="no">
        <aside className="hidden w-40 shrink-0 border-r border-white/10 bg-white/[0.02] p-3 text-white/45 sm:block">
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/30">Explorer</div>
          <Tree label="engine" depth={0} folder />
          <Tree label="match.ts" depth={1} active />
          <Tree label="book.ts" depth={1} />
          <Tree label="price.ts" depth={1} />
          <Tree label="order.ts" depth={0} />
        </aside>
        <pre className="min-w-0 flex-1 overflow-x-auto p-4">
          <code>
            {lines.map((ln, i) => (
              <div key={i} className="grid grid-cols-[1.75rem_1fr] gap-2">
                <span className="select-none text-right text-white/25">{i + 1}</span>
                <span className="text-white/80">{ln}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}

/** Terminal card: a request and its settled result. */
export function TerminalMock({ fontClass, className }: { fontClass?: string; className?: string }) {
  return (
    <div className={cn(CHROME, className)}>
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/40">
        <span className="size-3 rounded-full bg-white/20" aria-hidden="true" />
        <span className="size-3 rounded-full bg-white/20" aria-hidden="true" />
        <span className="size-3 rounded-full bg-white/20" aria-hidden="true" />
        <span className="ml-3">Terminal</span>
      </div>
      <pre
        className={cn('overflow-x-auto p-4 text-[12.5px] leading-[1.8]', fontClass)}
        translate="no"
      >
        <code className="text-white/80">
          <div>
            <F>$</F> curl -sX POST /api/orders -d @ask.json
          </div>
          <div className="text-white/60">{'{ "orderId": "a1b2…", "status": "open" }'}</div>
          <div className="mt-3 text-white/40">
            <C># trade/executed</C>
          </div>
          <div>
            AAPL <span className="text-white/50">1,000</span> @ <S>$10.00</S>
          </div>
          <div className="text-white/60">seller +$10,000.00 buyer -$10,000.00</div>
        </code>
      </pre>
    </div>
  )
}

function Tab({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-md px-2.5 py-1 text-xs',
        active ? 'bg-white/10 text-white' : 'text-white/40',
      )}
    >
      {children}
    </span>
  )
}

function Tree({
  label,
  depth,
  folder = false,
  active = false,
}: {
  label: string
  depth: number
  folder?: boolean
  active?: boolean
}) {
  return (
    <div
      style={{ paddingLeft: `${depth * 0.75}rem` }}
      className={cn('truncate py-0.5', active ? 'text-white' : folder ? 'text-white/55' : '')}
    >
      {folder ? '▸ ' : ''}
      {label}
    </div>
  )
}

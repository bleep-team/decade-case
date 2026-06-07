'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'motion/react'

const EASE: [number, number, number, number] = [0.44, 0, 0.56, 1]
const TEXT_COLUMN_PX = 240
const AMBER = '#f0a868'
const MONO: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }

/* Interactive row of three platform cards. Hovering/focusing a card expands it
 * (motion flexGrow) to reveal its preview; collapsed cards show just the text.
 * Stacks vertically on mobile. */
export function PlatformCards() {
  const [active, setActive] = useState(0)

  return (
    <ol className="grid gap-3 md:flex md:gap-3">
      {CARDS.map((card, i) => {
        const isActive = active === i
        const Preview = card.Preview
        return (
          <motion.li
            key={card.title}
            initial={false}
            animate={{ flexGrow: isActive ? 3 : 1 }}
            transition={{ duration: 0.55, ease: EASE }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            tabIndex={0}
            style={{ flexBasis: 0 }}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/40 md:h-[340px] md:min-w-[240px] md:cursor-pointer"
          >
            {/* Desktop: fixed text column + preview filling the rest. */}
            <div className="absolute inset-0 hidden md:flex">
              <span
                className="absolute left-7 top-7 text-xs uppercase tracking-widest text-white/40"
                style={MONO}
              >
                {card.n}
              </span>
              <div
                className="flex shrink-0 flex-col justify-center px-7 py-7"
                style={{ width: TEXT_COLUMN_PX }}
              >
                <h3 className="text-balance text-lg font-semibold leading-snug">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{card.body}</p>
              </div>
              <div className="relative my-6 mr-7 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
                <Preview />
              </div>
            </div>

            {/* Mobile: stacked, preview inline. */}
            <div className="flex flex-col p-6 md:hidden">
              <span className="text-xs uppercase tracking-widest text-white/40" style={MONO}>
                {card.n}
              </span>
              <div className="mt-6 flex flex-col gap-2">
                <h3 className="text-balance text-lg font-semibold leading-snug">{card.title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{card.body}</p>
              </div>
              <div
                aria-hidden="true"
                className="relative mt-6 aspect-[4/3] min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]"
              >
                <Preview />
              </div>
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}

/* Card previews follow the look of exact.framer.ai: a realistic dark app window
 * floating over a warm "golden-hour" glow, cropped at the card edge. The glow is
 * recreated in CSS (a homage to Exact's sunset-field backdrop, not their
 * copyrighted image) in Decade's amber, so the window stays dark and on-brand. */
function PreviewBoard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Golden-hour ambient scene: a dusty sky falling into a warm amber field. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(165deg, #5d6675 0%, #8c7d5e 40%, #c1924b 66%, #a9692b 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(60% 50% at 64% 22%, rgba(255,221,160,0.6), transparent 62%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(120% 80% at 50% 124%, rgba(86,42,14,0.55), transparent 60%)',
        }}
      />

      {/* Floating dark app window. On desktop it crops off the right edge like
       * Exact; on mobile it stays fully contained so content always fits. */}
      <div className="absolute bottom-6 left-4 right-4 top-6 overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-[0_24px_55px_-14px_rgba(0,0,0,0.75)] md:left-5 md:right-[-26px]">
        <div className="flex items-center justify-center border-b border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-[10px] text-white" style={MONO}>
            {label}
          </span>
        </div>
        <div className="relative h-[calc(100%-33px)]">{children}</div>
      </div>
    </div>
  )
}

const ASK_LADDER = [
  { price: '10.03', size: '90', w: 26 },
  { price: '10.02', size: '240', w: 70 },
  { price: '10.01', size: '150', w: 44 },
]
const BID_LADDER = [
  { price: '9.99', size: '180', w: 52 },
  { price: '9.98', size: '320', w: 84 },
  { price: '9.97', size: '100', w: 30 },
]

/* Card 01 depicts matching as a depth-of-market ladder: asks stacked above, bids
 * below, sized by resting volume. A glowing amber row sits at the touch where a
 * trade prints, pulsing on a loop so a fill looks like it just fired. */
function MatchPreview() {
  return (
    <PreviewBoard label="AAPL · matching">
      <div className="flex h-full items-center justify-center px-4 md:pr-11">
        <div className="w-full max-w-[250px]" style={MONO}>
          {ASK_LADDER.map((r) => (
            <LadderRow key={r.price} price={r.price} size={r.size} w={r.w} side="ask" />
          ))}

          <div className="my-1 flex items-center justify-center gap-2 rounded-[3px] border-y border-white/10 bg-white/[0.03] py-1.5 text-[11px]">
            <span className="tabular-nums" style={{ color: AMBER }}>
              1,000 @ $10.00
            </span>
            <span className="text-[9px] uppercase tracking-wider text-white/40">filled</span>
          </div>

          {BID_LADDER.map((r) => (
            <LadderRow key={r.price} price={r.price} size={r.size} w={r.w} side="bid" />
          ))}
        </div>
      </div>
    </PreviewBoard>
  )
}

/* One depth-of-market row: a neutral price in the centre, with a volume bar that
 * grows outward from the price column — left for bids, right for asks. */
function LadderRow({
  price,
  size,
  w,
  side,
}: {
  price: string
  size: string
  w: number
  side: 'ask' | 'bid'
}) {
  const isAsk = side === 'ask'
  const bar = isAsk ? 'rgba(239,68,68,0.22)' : 'rgba(16,185,129,0.24)'
  const text = isAsk ? 'text-rose-200/90' : 'text-emerald-200/90'
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-[3px] text-[11px]">
      <div className="relative flex h-[18px] items-center justify-end pr-1">
        {!isAsk && (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 rounded-sm"
              style={{ width: `${w}%`, backgroundColor: bar }}
            />
            <span className={`relative ${text}`}>{size}</span>
          </>
        )}
      </div>
      <span className="w-12 text-center tabular-nums text-white/80">{price}</span>
      <div className="relative flex h-[18px] items-center justify-start pl-1">
        {isAsk && (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ width: `${w}%`, backgroundColor: bar }}
            />
            <span className={`relative ${text}`}>{size}</span>
          </>
        )}
      </div>
    </div>
  )
}

const CANDLES = [
  { o: 9.88, h: 9.92, l: 9.86, c: 9.9 },
  { o: 9.9, h: 9.93, l: 9.88, c: 9.89 },
  { o: 9.89, h: 9.95, l: 9.88, c: 9.94 },
  { o: 9.94, h: 9.97, l: 9.92, c: 9.96 },
  { o: 9.96, h: 9.98, l: 9.93, c: 9.94 },
  { o: 9.94, h: 9.99, l: 9.93, c: 9.98 },
  { o: 9.98, h: 10.01, l: 9.96, c: 10.0 },
  { o: 10.0, h: 10.02, l: 9.98, c: 9.99 },
  { o: 9.99, h: 10.03, l: 9.98, c: 10.02 },
  { o: 10.02, h: 10.04, l: 10.0, c: 10.01 },
  { o: 10.01, h: 10.03, l: 9.99, c: 10.0 },
  { o: 10.0, h: 10.02, l: 9.97, c: 9.98 },
  { o: 9.98, h: 10.02, l: 9.97, c: 10.01 },
  { o: 10.01, h: 10.03, l: 9.99, c: 10.0 },
]

/* Card 02 depicts live market data as a candlestick price chart — the universally
 * recognised "stock" image. Green up-candles, red down-candles, with the current
 * price marked by a dashed amber line that ties back to the readout. */
function BookPreview() {
  const W = 260
  const TOP = 14
  const BOTTOM = 108
  const P_MIN = 9.83
  const P_MAX = 10.07
  const y = (p: number) => TOP + ((P_MAX - p) / (P_MAX - P_MIN)) * (BOTTOM - TOP)
  const slot = W / CANDLES.length
  const bodyW = slot * 0.55
  return (
    <PreviewBoard label="AAPL · price">
      <div className="flex h-full items-center justify-center px-4 md:pr-12">
        <div className="w-full max-w-[260px]" style={MONO}>
          <div className="mb-1.5 flex items-baseline gap-2 px-1">
            <span className="text-[15px] font-semibold tabular-nums text-white">$10.00</span>
            <span className="text-[10px] tabular-nums text-emerald-400">+0.42%</span>
          </div>

          <svg viewBox={`0 0 ${W} 122`} className="w-full" role="img" aria-label="Price chart">
            {/* Current price level. */}
            <line
              x1="0"
              y1={y(10.0)}
              x2={W}
              y2={y(10.0)}
              stroke="rgba(240,168,104,0.35)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {CANDLES.map((cdl, i) => {
              const cx = i * slot + slot / 2
              const up = cdl.c >= cdl.o
              const color = up ? '#34d399' : '#f87171'
              const bodyTop = y(Math.max(cdl.o, cdl.c))
              const bodyBottom = y(Math.min(cdl.o, cdl.c))
              return (
                <g key={i}>
                  <line
                    x1={cx}
                    y1={y(cdl.h)}
                    x2={cx}
                    y2={y(cdl.l)}
                    stroke={color}
                    strokeWidth="1"
                  />
                  <rect
                    x={cx - bodyW / 2}
                    y={bodyTop}
                    width={bodyW}
                    height={Math.max(1.5, bodyBottom - bodyTop)}
                    fill={color}
                    rx="1"
                  />
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </PreviewBoard>
  )
}

/* Card 03 shows the two halves of the copy: an atomic settlement (cash and shares
 * moving together in one transaction) and the signed webhook that fires on the
 * fill, delivered with a 200 OK. */
function WebhookPreview() {
  return (
    <PreviewBoard label="settlement">
      <div className="flex h-full flex-col justify-center gap-2.5 px-4 md:pr-12" style={MONO}>
        {/* Atomic settlement: both legs in one transaction. */}
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2">
          <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-wider text-white/35">
            <span>trade settled</span>
            <span>1 transaction</span>
          </div>
          <LedgerRow party="Buyer" shares="+1,000" cash="−$10,000.00" sharesUp cashUp={false} />
          <LedgerRow party="Seller" shares="−1,000" cash="+$10,000.00" sharesUp={false} cashUp />
        </div>

        {/* Signed webhook, delivered. */}
        <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px]">
          <span className="text-white/70">
            <span className="text-white/35">POST</span> /webhooks/trade
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
            200 OK
          </span>
        </div>
      </div>
    </PreviewBoard>
  )
}

/* One settlement leg: a party with its share delta and cash delta, coloured by
 * direction so the swap reads as one balanced move. */
function LedgerRow({
  party,
  shares,
  cash,
  sharesUp,
  cashUp,
}: {
  party: string
  shares: string
  cash: string
  sharesUp: boolean
  cashUp: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[11px]">
      <span className="text-white/55">{party}</span>
      <div className="flex items-center gap-2.5">
        <span
          className={`whitespace-nowrap ${sharesUp ? 'text-emerald-300/90' : 'text-rose-300/90'}`}
        >
          {shares} AAPL
        </span>
        <span
          className={`w-[4.5rem] whitespace-nowrap text-right tabular-nums ${cashUp ? 'text-emerald-300/90' : 'text-rose-300/90'}`}
        >
          {cash}
        </span>
      </div>
    </div>
  )
}

const CARDS: {
  n: string
  title: string
  body: string
  Preview: () => React.ReactNode
}[] = [
  {
    n: '01',
    title: 'Order matching',
    body: 'Best price first, then first in line. Big orders fill in pieces.',
    Preview: MatchPreview,
  },
  {
    n: '02',
    title: 'Live market data',
    body: 'A live order book and price for every symbol.',
    Preview: BookPreview,
  },
  {
    n: '03',
    title: 'Settlement & webhooks',
    body: 'Cash and shares settle at once, with a webhook on every fill.',
    Preview: WebhookPreview,
  },
]

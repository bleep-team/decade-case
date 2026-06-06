'use client'

import { useState, type CSSProperties } from 'react'
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
                className="flex shrink-0 flex-col px-7 pb-7 pt-[10rem]"
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
                className="relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]"
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

function MatchPreview() {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center gap-2.5 p-6 text-[13px] text-white/80"
      style={MONO}
    >
      <Quote label="BID" qty="1,000" price="$10.00" />
      <Quote label="ASK" qty="1,000" price="$10.00" />
      <div className="my-1 h-px bg-white/10" />
      <div className="flex items-center gap-2" style={{ color: AMBER }}>
        <span>&#10003;</span>
        <span>filled 1,000 @ $10.00</span>
      </div>
    </div>
  )
}

function Quote({ label, qty, price }: { label: string; qty: string; price: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-white/45">{label}</span>
      <span className="text-white/60">{qty}</span>
      <span className="text-white">{price}</span>
    </div>
  )
}

const ASKS = [
  { px: '10.04', w: 38 },
  { px: '10.02', w: 64 },
  { px: '10.01', w: 30 },
]
const BIDS = [
  { px: '9.99', w: 70 },
  { px: '9.98', w: 44 },
  { px: '9.97', w: 26 },
]

function BookPreview() {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center gap-1.5 p-6 text-[12px]"
      style={MONO}
    >
      {ASKS.map((r) => (
        <DepthRow key={r.px} px={r.px} w={r.w} />
      ))}
      <div className="my-1 flex items-center justify-between text-[13px]" style={{ color: AMBER }}>
        <span>$10.00</span>
        <span className="text-white/40">last</span>
      </div>
      {BIDS.map((r) => (
        <DepthRow key={r.px} px={r.px} w={r.w} />
      ))}
    </div>
  )
}

function DepthRow({ px, w }: { px: string; w: number }) {
  return (
    <div className="relative flex items-center justify-between rounded-sm px-2 py-1 text-white/70">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-sm bg-white/[0.06]"
        style={{ width: `${w}%` }}
      />
      <span className="relative">{px}</span>
    </div>
  )
}

const WEBHOOK = `POST /webhooks/trade

{
  "event": "trade.executed",
  "symbol": "AAPL",
  "price": 1000,
  "quantity": 1000
}`

function WebhookPreview() {
  return (
    <pre
      className="absolute inset-0 overflow-hidden p-6 text-[12px] leading-relaxed text-white/70"
      style={MONO}
    >
      <code>{WEBHOOK}</code>
    </pre>
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
    body: 'Continuous price-time priority per symbol, with partial fills and execution at the seller’s price.',
    Preview: MatchPreview,
  },
  {
    n: '02',
    title: 'Live market data',
    body: 'Top-of-book bids and asks, plus a moving-average price for every symbol.',
    Preview: BookPreview,
  },
  {
    n: '03',
    title: 'Settlement & webhooks',
    body: 'Balances settle in one transaction; signed, retried webhooks fire on every fill.',
    Preview: WebhookPreview,
  },
]

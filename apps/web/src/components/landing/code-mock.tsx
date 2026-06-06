import { cn } from '@decade/ui/lib/utils'

/**
 * Placeholder editor-window mock. Generic sample code only — stands in for the
 * product screenshots in the source template. Pass a mono-font className.
 */
export function CodeMock({ fontClass, className }: { fontClass?: string; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/50',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="size-3 rounded-full bg-white/20" aria-hidden="true" />
        <span className="size-3 rounded-full bg-white/20" aria-hidden="true" />
        <span className="size-3 rounded-full bg-white/20" aria-hidden="true" />
        <span className="ml-3 text-xs text-white/40">match.ts</span>
      </div>
      <pre
        className={cn('overflow-x-auto p-5 text-[13px] leading-relaxed', fontClass)}
        translate="no"
      >
        <code>
          <Ln>
            <K>export function</K> <Fn>matchOrder</Fn>
            <P>(book: OrderBook, incoming: Order) {'{'}</P>
          </Ln>
          <Ln indent={1}>
            <K>const</K> trades: Trade[] = []
          </Ln>
          <Ln indent={1}>
            <K>while</K> (incoming.remaining {'>'} <N>0</N>) {'{'}
          </Ln>
          <Ln indent={2}>
            <K>const</K> resting = book.<Fn>bestMatch</Fn>(incoming)
          </Ln>
          <Ln indent={2}>
            <K>if</K> (!resting) <K>break</K>
          </Ln>
          <Ln indent={2}>
            <C>// execute at the seller&rsquo;s price</C>
          </Ln>
          <Ln indent={2}>
            trades.<Fn>push</Fn>(<Fn>fill</Fn>(incoming, resting))
          </Ln>
          <Ln indent={1}>{'}'}</Ln>
          <Ln indent={1}>
            <K>return</K> trades
          </Ln>
          <Ln>{'}'}</Ln>
        </code>
      </pre>
    </div>
  )
}

function Ln({ children, indent = 0 }: { children: React.ReactNode; indent?: number }) {
  return (
    <div style={{ paddingLeft: `${indent * 1.5}rem` }} className="text-white/80">
      {children}
    </div>
  )
}
const K = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#0099ff]">{children}</span>
)
const Fn = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#d5ff45]">{children}</span>
)
const N = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#d5ff45]">{children}</span>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white/80">{children}</span>
)
const C = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white/35">{children}</span>
)

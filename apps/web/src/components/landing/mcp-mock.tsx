import { ChevronDown, Mic, PanelLeft, Plus } from 'lucide-react'
import { cn } from '@decade/ui/lib/utils'

/* The Claude sunburst, recreated as 11 tapered rays in Anthropic's brand orange
 * (#d97757) — an evocation of the logo, not the trademark file itself. */
function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('size-[18px]', className)} aria-hidden="true">
      {Array.from({ length: 11 }).map((_, i) => (
        <path
          key={i}
          d="M10 1.6 L10.85 6.6 L10 10 L9.15 6.6 Z"
          fill="#d97757"
          transform={`rotate(${(360 / 11) * i} 10 10)`}
        />
      ))}
    </svg>
  )
}

/** A faithful Claude desktop window: the broker asks in plain language, Claude
 * calls Decade's `place_order` MCP tool, and reports the fill. Light theme,
 * serif reply, sunburst, and composer all mirror the real app. */
export function McpMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-black/10 bg-[#faf9f5] text-[#141413] shadow-2xl shadow-black/40',
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-black/[0.06] px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ec6a5e]" />
          <span className="size-2.5 rounded-full bg-[#f5bf4f]" />
          <span className="size-2.5 rounded-full bg-[#62c554]" />
        </div>
        <PanelLeft className="size-3.5 text-[#8a877d]" aria-hidden="true" />
        <span className="flex items-center gap-1 text-[12.5px] font-medium">
          Decade
          <ChevronDown className="size-3 text-[#8a877d]" aria-hidden="true" />
        </span>
      </div>

      {/* Conversation */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-5">
        <div className="flex justify-end">
          <span className="rounded-2xl bg-[#ecebe4] px-3.5 py-2 text-[13px]">
            Buy 1,000 AAPL at market.
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="flex items-center gap-1 text-[12px] text-[#8a877d]">
            Thought for 2s
            <ChevronDown className="size-3 -rotate-90" aria-hidden="true" />
          </span>
          <span className="flex items-center gap-1 text-[12.5px] text-[#8a877d]">
            Called place_order via decade-mcp
            <ChevronDown className="size-3 -rotate-90" aria-hidden="true" />
          </span>
          <p className="font-serif text-[14.5px] leading-relaxed">
            Done. I placed a market buy for 1,000 AAPL and it filled at $10.00.
          </p>
          <ClaudeMark />
        </div>
      </div>

      {/* Composer */}
      <div className="px-3.5 pb-3.5">
        <div className="rounded-[18px] border border-black/10 bg-white px-3.5 pb-2.5 pt-3">
          <span className="text-[13px] text-[#a8a59b]">Write a message…</span>
          <div className="mt-3 flex items-center justify-between text-[#8a877d]">
            <Plus className="size-4" aria-hidden="true" />
            <div className="flex items-center gap-2.5">
              <span className="text-[12px]">
                <span className="font-medium text-[#141413]">Opus 4.8</span> Medium
              </span>
              <Mic className="size-3.5" aria-hidden="true" />
              <span className="flex size-5 items-center justify-center rounded-md border border-black/15">
                <span className="size-2 rounded-[2px] bg-[#141413]" />
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-[#a8a59b]">
          Claude is AI and can make mistakes.
        </p>
      </div>
    </div>
  )
}

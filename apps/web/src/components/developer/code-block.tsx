'use client'

import { Check, Copy } from 'lucide-react'
import { useCopy } from '@/lib/use-copy'

export interface CodeBlockProps {
  /** Short label shown in the block's header bar (e.g. the protocol or "cURL"). */
  label: string
  /** The code to display and copy. */
  code: string
  /** Optional accessible name for the code region. */
  ariaLabel?: string
}

/**
 * A documentation code block in the Stripe idiom: a header bar carrying a label
 * and a copy control, over a monospaced, horizontally-scrollable body. Keeps the
 * developer page's endpoints and examples scannable and copy-pasteable.
 */
export function CodeBlock({ label, code, ariaLabel }: CodeBlockProps) {
  const { copied, copy } = useCopy()

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => void copy(code)}
          aria-label="Copy to clipboard"
          className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        aria-label={ariaLabel}
        className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground"
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

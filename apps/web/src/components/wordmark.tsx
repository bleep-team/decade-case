/** The Decade Exchange cross mark: an outlined bowtie — a bid and ask crossing. */
export function DecadeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Decade Exchange"
    >
      <path
        d="M5 4.5 L19 4.5 L12 12 L19 19.5 L5 19.5 L12 12 Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Brand lockup: the cross mark beside the spaced wordmark. */
export function Wordmark({
  className,
  showName = true,
}: {
  className?: string
  showName?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      <DecadeMark className="size-7 shrink-0" />
      {showName ? (
        <span className="flex items-center gap-2.5 sm:gap-3">
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          <span
            className="whitespace-nowrap text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-[0.7rem] sm:tracking-[0.22em]"
            translate="no"
          >
            Decade Exchange
          </span>
        </span>
      ) : null}
    </span>
  )
}

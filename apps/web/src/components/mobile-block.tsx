import { Monitor } from 'lucide-react'
import { Wordmark } from './wordmark'

/**
 * Full-screen, desktop-only interstitial shown after authentication when the
 * request comes from a phone. Informational only: there is no "continue anyway"
 * bypass. The trading terminal (a live order book, ticket, positions, and
 * history side by side) is built for real screen width, so the app is
 * desktop-first. Rendered in place of the app shell, so it inherits the theme
 * but skips the header and the dense panels entirely.
 */
export function MobileBlock() {
  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 text-center text-foreground"
      data-testid="mobile-block"
    >
      {/* Decorative brand-accent glow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 size-80 rounded-full bg-brand/15 blur-[120px]"
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10 ring-1 ring-brand/20">
          <Monitor className="size-8 text-brand" aria-hidden="true" />
        </div>

        <h1 className="max-w-md text-2xl font-semibold tracking-tight">
          Decade is built for desktop
        </h1>
        <p className="max-w-sm text-base text-muted-foreground">
          The trading terminal (live order book, ticket, positions, and history side by side) needs
          room to breathe. Open Decade on a desktop or laptop to start trading.
        </p>

        <Wordmark className="mt-2" />
      </div>
    </main>
  )
}

MobileBlock.displayName = 'MobileBlock'

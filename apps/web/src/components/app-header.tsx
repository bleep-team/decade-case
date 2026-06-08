'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github, RotateCcw } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@decade/ui/components/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@decade/ui/components/alert-dialog'
import { cn } from '@decade/ui/lib/utils'
import { REPO_URL } from '@/lib/site'
import { Wordmark } from './wordmark'

/** The app's top-level pages, exposed as header navigation. */
const NAV_LINKS = [
  { href: '/app', label: 'Terminal' },
  { href: '/app/history', label: 'History' },
  { href: '/app/developer', label: 'Developer' },
  { href: '/app/guide', label: 'How it works' },
] as const

export interface AppHeaderProps {
  /**
   * Reset handler, run on confirmation. Defaults to POSTing the demo-reset
   * endpoint and reloading; overridable in tests.
   */
  onReset?: () => void | Promise<void>
}

/** Default reset: cancel the broker's open orders and restore starting cash. */
async function defaultReset(): Promise<void> {
  await fetch('/api/demo/reset', { method: 'POST' })
  window.location.reload()
}

/**
 * The app header, laid out in three zones: the wordmark and a "Demo" context
 * badge on the left, the primary navigation centered with a brand-accent active
 * indicator, and the demo-reset control + Clerk user button on the right. The
 * reset dialog is controlled so the confirm path is deterministic to test.
 */
export function AppHeader({ onReset = defaultReset }: AppHeaderProps) {
  const [confirming, setConfirming] = useState(false)
  const pathname = usePathname()

  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border px-6 py-3">
      <div className="flex items-center gap-3">
        <Link
          href="/app"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Decade Exchange home"
        >
          <Wordmark />
        </Link>
        <span className="hidden rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-brand sm:inline-block">
          Demo
        </span>
      </div>

      <nav aria-label="Primary" className="flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
              {active ? (
                <span
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center justify-end gap-3">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Github className="size-4" aria-hidden="true" />
        </a>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setConfirming(true)}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset demo
        </Button>
        <div className="h-5 w-px bg-border" aria-hidden="true" />
        <UserButton />
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
            <AlertDialogDescription>
              This cancels your open orders, clears your positions, and restores your starting
              balance. Your trade history is kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onReset()}>Reset demo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}

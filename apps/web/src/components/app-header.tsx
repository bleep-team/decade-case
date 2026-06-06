'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
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
import { Wordmark } from './wordmark'

/** The app's top-level pages, exposed as header navigation. */
const NAV_LINKS = [
  { href: '/app', label: 'Terminal' },
  { href: '/app/history', label: 'History' },
  { href: '/app/developer', label: 'Developer' },
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
 * The app header: the wordmark, thin Terminal / History / Developer navigation,
 * a reset action guarded by a confirmation dialog, and the Clerk user button.
 * The reset dialog is controlled so the confirm path is deterministic to test.
 */
export function AppHeader({ onReset = defaultReset }: AppHeaderProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center gap-6">
        <Link
          href="/app"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Decade Exchange home"
        >
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setConfirming(true)}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </Button>
        <UserButton />
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your open orders and restore your starting balance. This cannot be
              undone.
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

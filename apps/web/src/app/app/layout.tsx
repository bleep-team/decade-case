import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { AppHeader } from '@/components/app-header'
import { MobileBlock } from '@/components/mobile-block'
import { isMobileDevice } from '@/server/mobile-gate'

export default async function AppLayout({ children }: { children: ReactNode }) {
  // The terminal is desktop-first; phones get an interstitial instead of the
  // app shell. Runs after Clerk auth (middleware guards /app), so a blocked
  // visitor is already signed in. Fails open — see `isMobileDevice`.
  if (await isMobileDevice(headers)) {
    return <MobileBlock />
  }

  return (
    <div className="flex h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <AppHeader />
      <main id="main-content" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full max-w-7xl p-6">{children}</div>
      </main>
    </div>
  )
}

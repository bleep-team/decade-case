import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'

export default function AppLayout({ children }: { children: ReactNode }) {
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

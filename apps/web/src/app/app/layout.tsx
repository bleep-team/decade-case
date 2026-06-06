import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>
    </div>
  )
}

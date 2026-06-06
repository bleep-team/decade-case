import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  )
}

import type { ReactNode } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
        <Link href="/app" className="font-semibold tracking-tight">
          Decade Exchange
        </Link>
        <UserButton />
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  )
}

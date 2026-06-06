import type { ReactNode } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Wordmark } from '@/components/wordmark'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link
          href="/app"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Wordmark />
        </Link>
        <UserButton />
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  )
}

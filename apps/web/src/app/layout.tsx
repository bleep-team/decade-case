import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Decade Exchange',
  description: 'A mini stock exchange — brokers submit orders and the engine matches trades.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-white text-zinc-900 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}

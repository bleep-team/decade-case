import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import '@decade/ui/styles/globals.css'

// One typeface across the whole app and landing: Inter (sans). Numbers use the
// Tailwind `font-mono` stack. Playfair was dropped — it was used on a single
// heading, which read as an inconsistent font.
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Decade Exchange',
  description: 'A mini stock exchange where brokers submit orders and the engine matches trades.',
}

export const viewport = {
  themeColor: '#0a0908',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${sans.variable}`}>
        <body className="min-h-screen font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}

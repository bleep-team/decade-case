import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
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

/**
 * Brand-aligned appearance for every embedded Clerk component (SignIn, SignUp,
 * UserButton). The `dark` base theme is the backstop so any element we do not
 * map explicitly still renders dark; `variables` then pin Clerk to the exact
 * design tokens authored once in `@decade/ui` globals.css, so the auth UI
 * tracks the brand palette with no second source of truth. Passed as a literal
 * so its keys are type-checked against Clerk's `appearance` prop at this site.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: 'var(--primary)',
          colorBackground: 'var(--card)',
          colorForeground: 'var(--foreground)',
          colorMutedForeground: 'var(--muted-foreground)',
          colorInput: 'var(--input)',
          colorInputForeground: 'var(--foreground)',
          colorNeutral: 'var(--foreground)',
          colorDanger: 'var(--destructive)',
          colorRing: 'var(--ring)',
          colorBorder: 'var(--border)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-inter)',
        },
        elements: {
          // Flat, minimal cards to match the rest of the product surface.
          card: 'bg-card border border-border shadow-none',
        },
      }}
    >
      <html lang="en" className={`dark ${sans.variable}`}>
        <body className="min-h-screen font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}

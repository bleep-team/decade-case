import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, Playfair_Display } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import '@decade/ui/styles/globals.css'

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const serif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Decade Exchange',
  description: 'A mini stock exchange where brokers submit orders and the engine matches trades.',
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
          // Echo the editorial Playfair display type used across the brand.
          headerTitle: 'font-serif',
        },
      }}
    >
      <html lang="en" className={`dark ${sans.variable} ${serif.variable}`}>
        <body className="min-h-screen font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}

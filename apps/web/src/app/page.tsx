import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@decade/ui/components/button'
import { cn } from '@decade/ui/lib/utils'
import { Wordmark } from '@/components/wordmark'
import { Reveal } from '@/components/landing/reveal'
import { SmoothScroll } from '@/components/landing/smooth-scroll'
import { EtheralShadow } from '@/components/landing/etheral-shadow'
import { McpMock } from '@/components/landing/mcp-mock'
import { PlatformCards } from '@/components/landing/platform-cards'

const GITHUB_URL = 'https://github.com/bleep-team/decade-case'

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[#0a0908] text-white antialiased">
        <SiteHeader />
        <main>
          <Hero />
          <Platform />
          <CodeFeatures />
        </main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  )
}

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-6', className)}>{children}</div>
}

const NAV_LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#developers', label: 'Developers' },
]

function SiteHeader() {
  return (
    <header className="sticky top-4 z-50 px-4">
      <nav className="relative mx-auto flex h-[68px] max-w-5xl items-center justify-between gap-2 rounded-full border border-white/10 bg-white/[0.06] pl-5 pr-2 shadow-lg shadow-black/30 backdrop-blur-md sm:pl-7 sm:pr-2.5">
        <Link
          href="/"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Wordmark />
        </Link>
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm text-white/60 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {link.label}
            </a>
          ))}
        </div>
        <Link href="/sign-up">
          <Button size="lg" className="rounded-full">
            Get Started
          </Button>
        </Link>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative isolate -mt-[84px] flex min-h-screen items-center overflow-hidden pt-[84px]">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <EtheralShadow
          className="h-full w-full"
          color="rgba(170, 170, 180, 1)"
          animation={{ scale: 70, speed: 85 }}
          noise={{ opacity: 0.35, scale: 1.4 }}
          sizing="fill"
        />
        {/* darken for legibility + fade into the page background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0908]/40 via-[#0a0908]/10 to-[#0a0908]" />
      </div>
      <Shell className="flex flex-col items-center gap-8 py-24 text-center">
        <Reveal delay={80}>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Where every order finds its match.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="max-w-xl text-pretty text-lg text-white/60">
            A small stock exchange that pairs your buy and sell orders the instant their prices
            meet.
          </p>
        </Reveal>
        <Reveal delay={240} className="relative flex flex-wrap items-center justify-center gap-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -inset-y-16 -z-10"
            style={{
              background:
                'radial-gradient(50% 60% at 50% 50%, rgba(240,168,104,0.14), transparent 70%)',
            }}
          />
          <Link href="/sign-up">
            <Button size="lg" className="rounded-full">
              Create a Broker Account
            </Button>
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white"
            >
              View Source
            </Button>
          </a>
        </Reveal>
      </Shell>
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <Reveal className="max-w-2xl">
      <span className="text-xs font-medium uppercase tracking-[0.22em] text-white/40">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {body ? <p className="mt-4 text-pretty text-white/55">{body}</p> : null}
    </Reveal>
  )
}

function Platform() {
  return (
    <section id="platform" className="scroll-mt-20 border-t border-white/5 py-24">
      <Shell>
        <SectionHeading
          eyebrow="The platform"
          title="Everything a broker needs"
          body="A full trading surface, from the dashboard or the API."
        />
        <Reveal className="mt-12">
          <PlatformCards />
        </Reveal>
      </Shell>
    </section>
  )
}

const DEV_POINTS = [
  'Place a buy or sell order, get an id back.',
  'Get a signed webhook on every fill.',
  'Drive it all from an LLM over MCP.',
]

function CodeFeatures() {
  return (
    <section
      id="developers"
      className="scroll-mt-20 border-y border-white/5 bg-white/[0.015] py-24 lg:py-32"
    >
      <Shell>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="min-w-0">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-white/40">
              For developers
            </span>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Built to build on
            </h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-white/55">
              A clean REST API over a matching engine you can actually reason about.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {DEV_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(240,168,104,0.16)' }}
                  >
                    <Check className="size-3" style={{ color: '#f0a868' }} aria-hidden="true" />
                  </span>
                  <span className="text-base text-white/80">{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/sign-up">
                <Button size="lg" className="rounded-full">
                  Create a Broker Account
                </Button>
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white"
                >
                  View Source
                </Button>
              </a>
            </div>
          </Reveal>

          <Reveal delay={100} className="relative min-w-0">
            {/* Golden-hour board behind the editor, matching the platform-card
             * previews: the dark window floats over a warm amber glow. */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(165deg, #5d6675 0%, #8c7d5e 40%, #c1924b 66%, #a9692b 100%)',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(55% 45% at 62% 16%, rgba(255,221,160,0.5), transparent 62%)',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 80% at 50% 122%, rgba(86,42,14,0.5), transparent 60%)',
                }}
              />
              <div className="relative p-5 sm:p-7">
                <McpMock />
              </div>
            </div>
          </Reveal>
        </div>
      </Shell>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-12">
      <Shell className="flex flex-col items-start justify-between gap-4 text-sm text-white/40 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <Wordmark showName={false} />
          <span>Built for the Decade engineering case.</span>
        </div>
        <nav className="flex items-center gap-5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md transition-colors hover:text-white"
          >
            GitHub
          </a>
          <Link href="/app" className="rounded-md transition-colors hover:text-white">
            Dashboard
          </Link>
        </nav>
      </Shell>
    </footer>
  )
}

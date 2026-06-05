import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@decade/ui/components/button'

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-semibold tracking-tight">Decade Exchange</span>
        <nav className="flex items-center gap-3">
          <SignedOut>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/app">
              <Button size="sm">Open dashboard</Button>
            </Link>
          </SignedIn>
        </nav>
      </header>

      <section className="flex flex-col items-start gap-6 py-24">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          A mini stock exchange
        </span>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight">
          Submit orders. Match trades. Settle in real time.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600">
          Decade Exchange receives bid and ask orders from brokers, keeps a live book per symbol,
          and executes matches at the seller&rsquo;s price with price-time priority and partial
          fills.
        </p>
        <div className="flex gap-3">
          <Link href="/sign-up">
            <Button size="lg">Create a broker account</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-6 border-t border-zinc-100 py-16 sm:grid-cols-3">
        <Feature
          title="Order matching"
          body="Continuous price-time priority matching, per symbol, with partial fills."
        />
        <Feature
          title="Live order book"
          body="Top-of-book bids and asks, current price, and broker balances over a REST API."
        />
        <Feature
          title="Execution webhooks"
          body="Get notified the moment a trade settles, with signed, retried delivery."
        />
      </section>
    </main>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2">
      <h2 className="font-medium">{title}</h2>
      <p className="text-sm text-zinc-600">{body}</p>
    </div>
  )
}

import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const user = await currentUser()
  const greeting = user?.firstName ? `, ${user.firstName}` : ''

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{greeting}</h1>
        <p className="text-zinc-600">
          Your broker dashboard. Submit orders, watch the book, and track balances.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Submit order" body="Place bid/ask orders on behalf of your customers." />
        <Card title="Order book" body="Live top-of-book bids and asks per symbol." />
        <Card title="Balance" body="Your settled cash balance across executed trades." />
      </div>

      <p className="text-sm text-zinc-500">
        These panels are wired to the REST API (<code>/api/orders</code>,{' '}
        <code>/api/stocks/:symbol/book</code>) — interactive widgets land next.
      </p>
    </div>
  )
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  )
}

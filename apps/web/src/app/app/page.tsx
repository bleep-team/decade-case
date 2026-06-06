import { currentUser } from '@clerk/nextjs/server'
import { Card, CardDescription, CardHeader, CardTitle } from '@decade/ui/components/card'

export default async function DashboardPage() {
  const user = await currentUser()
  const greeting = user?.firstName ? `, ${user.firstName}` : ''

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
          Welcome{greeting}
        </h1>
        <p className="text-muted-foreground">
          Your broker dashboard. Submit orders, watch the book, and track balances.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard
          title="Submit order"
          body="Place bid/ask orders on behalf of your customers."
        />
        <DashboardCard title="Order book" body="Live top-of-book bids and asks per symbol." />
        <DashboardCard title="Balance" body="Your settled cash balance across executed trades." />
      </div>

      <p className="text-sm text-muted-foreground">
        These panels are wired to the REST API (<code>/api/orders</code>,{' '}
        <code>/api/stocks/:symbol/book</code>). Interactive widgets land next.
      </p>
    </div>
  )
}

function DashboardCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  )
}

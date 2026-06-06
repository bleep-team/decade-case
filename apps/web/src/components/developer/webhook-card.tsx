'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { Badge } from '@decade/ui/components/badge'
import { Button } from '@decade/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@decade/ui/components/card'
import { Input } from '@decade/ui/components/input'
import { Label } from '@decade/ui/components/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@decade/ui/components/table'
import { formatTime } from '@/lib/format-time'

/** One recent webhook delivery attempt, as the developer page lists it. */
export interface DeliveryRow {
  id: string
  url: string
  tradeId: string
  status: string
  attempts: number
  createdAt: string
}

/** The webhook registration payload handed to the save action. */
export interface WebhookPayload {
  url: string
  secret: string
}

export interface WebhookCardProps {
  defaultUrl: string
  defaultSecret: string
  deliveries: DeliveryRow[]
  /** Called with the form payload when the broker saves the endpoint. */
  onSave: (payload: WebhookPayload) => void | Promise<void>
}

/**
 * The webhook panel: a registration form (URL + signing secret) and a table of
 * recent delivery attempts. Presentational — the save handler and delivery rows
 * come in as props; on submit it forms a {@link WebhookPayload} for `onSave`.
 */
export function WebhookCard({ defaultUrl, defaultSecret, deliveries, onSave }: WebhookCardProps) {
  const [url, setUrl] = useState(defaultUrl)
  const [secret, setSecret] = useState(defaultSecret)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void onSave({ url, secret })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        <CardDescription>
          A signed <code>trade.executed</code> POST is delivered to your endpoint on every fill.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              type="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://example.com/webhooks/decade"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Signing secret</Label>
            <Input
              id="webhook-secret"
              autoComplete="off"
              spellCheck={false}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">
            <Save className="size-4" aria-hidden="true" />
            Save webhook
          </Button>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Recent deliveries</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No deliveries yet.
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.tradeId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{d.attempts}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTime(d.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

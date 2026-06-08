'use client'

import { useState } from 'react'
import { Check, ChevronDown, Copy, Loader2, Save } from 'lucide-react'
import { Badge } from '@decade/ui/components/badge'
import { Button } from '@decade/ui/components/button'
import { Switch } from '@decade/ui/components/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@decade/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@decade/ui/components/collapsible'
import { Input } from '@decade/ui/components/input'
import { Label } from '@decade/ui/components/label'
import { cn } from '@decade/ui/lib/utils'
import { CodeBlock } from './code-block'
import { InfoTip } from '@/components/terminal/info-tip'
import { formatTime } from '@/lib/format-time'

/** One recent webhook delivery attempt, as the developer page lists it. */
export interface DeliveryRow {
  id: string
  url: string
  tradeId: string
  status: string
  attempts: number
  createdAt: string
  /** The exact JSON body that was delivered, pretty-printed for the expanded row. */
  payload: string
}

/** The webhook registration payload handed to the save action. */
export interface WebhookPayload {
  url: string
  secret: string
  /** When false, the endpoint is registered but deliveries are paused. */
  active: boolean
}

export interface WebhookCardProps {
  defaultUrl: string
  defaultSecret: string
  /** Whether the saved endpoint is currently active; defaults to on. */
  defaultActive?: boolean
  deliveries: DeliveryRow[]
  /** Called with the form payload when the broker saves the endpoint. */
  onSave: (payload: WebhookPayload) => void | Promise<void>
}

/** Example of the JSON body delivered on every fill (price is in integer cents). */
const PAYLOAD_EXAMPLE = `{
  "event": "trade.executed",
  "tradeId": "9f0c8d2a…",
  "symbol": "AAPL",
  "price": 19011,
  "quantity": 10,
  "bidOrderId": "6845b95a…",
  "askOrderId": "f82746c4…",
  "executedAt": "2026-06-06T22:00:00.000Z"
}`

/**
 * The webhook panel: a registration form (URL + signing secret), documentation of
 * the delivered payload and its signature, and a table of recent delivery
 * attempts. Presentational — the save handler and delivery rows come in as props;
 * on submit it forms a {@link WebhookPayload} for `onSave`.
 */
export function WebhookCard({
  defaultUrl,
  defaultSecret,
  defaultActive = true,
  deliveries,
  onSave,
}: WebhookCardProps) {
  const [url, setUrl] = useState(defaultUrl)
  const [secret, setSecret] = useState(defaultSecret)
  const [active, setActive] = useState(defaultActive)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // "Active" only means anything with somewhere to deliver — there is nothing to
  // activate until an endpoint URL is set, so the toggle is disabled and reads
  // off until then, and a save never reports active without a URL.
  const hasUrl = url.trim().length > 0
  const effectiveActive = active && hasUrl

  const handleCopySecret = async () => {
    await navigator.clipboard?.writeText(secret)
    setCopiedSecret(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('saving')
    try {
      await onSave({ url, secret, active: effectiveActive })
      setStatus('saved')
      window.setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
    }
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
            <div className="flex gap-2">
              <Input
                id="webhook-secret"
                className="flex-1"
                autoComplete="off"
                spellCheck={false}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy to clipboard"
                onClick={() => void handleCopySecret()}
              >
                {copiedSecret ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="webhook-active"
              checked={effectiveActive}
              onCheckedChange={setActive}
              disabled={!hasUrl}
            />
            <Label
              htmlFor="webhook-active"
              className={cn('text-sm', !hasUrl && 'text-muted-foreground')}
            >
              Active
            </Label>
            <InfoTip label="More information">
              {hasUrl
                ? 'When off, the endpoint stays saved but deliveries are paused, so a failing endpoint stops retrying.'
                : 'Add an endpoint URL to enable deliveries — there is nothing to activate yet.'}
            </InfoTip>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={status === 'saving'}>
              {status === 'saving' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {status === 'saving' ? 'Saving…' : 'Save webhook'}
            </Button>
            {status === 'saved' ? (
              <span className="flex items-center gap-1 text-sm text-emerald-400" role="status">
                <Check className="size-4" aria-hidden="true" />
                Saved
              </span>
            ) : null}
            {status === 'error' ? (
              <span className="text-sm text-destructive" role="status">
                Could not save. Try again.
              </span>
            ) : null}
          </div>
        </form>

        <Collapsible className="space-y-3">
          <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            What we deliver
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              On every fill involving you, we <code>POST</code> a JSON body for the{' '}
              <code>trade.executed</code> event:
            </p>
            <CodeBlock
              label="trade.executed"
              code={PAYLOAD_EXAMPLE}
              ariaLabel="Webhook payload example"
            />
            <p className="text-sm text-muted-foreground">
              <code>price</code> is the execution price in integer cents. The body is signed with
              HMAC-SHA256 over its raw bytes using your secret, sent in the{' '}
              <code>x-decade-signature</code> header (hex) — verify by recomputing the HMAC and
              comparing. Delivery is retried up to 4 times on failure.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-foreground">Recent deliveries</h3>
            <p className="text-xs text-muted-foreground">
              The 10 most recent delivery attempts, newest first. Expand a row to see the exact
              payload delivered.
            </p>
          </div>
          {deliveries.length === 0 ? (
            <p className="rounded-md border border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No deliveries yet.
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {deliveries.map((d) => (
                <Collapsible key={d.id}>
                  <CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                      aria-hidden="true"
                    />
                    <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                      {d.tradeId}
                    </code>
                    <Badge variant="outline">{d.status}</Badge>
                    <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                      {d.attempts} {d.attempts === 1 ? 'attempt' : 'attempts'}
                    </span>
                    <span className="hidden font-mono text-xs text-muted-foreground md:inline">
                      {formatTime(d.createdAt)}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <CodeBlock
                      label="Delivered payload"
                      code={d.payload}
                      ariaLabel={`Payload for trade ${d.tradeId}`}
                    />
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

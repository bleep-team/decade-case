'use client'

import { Braces, KeyRound, Webhook } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@decade/ui/components/tabs'
import { rotateApiKeyAction, saveWebhookAction } from '@/app/actions/developer'
import { useUrlState } from '@/lib/use-url-state'
import { ApiKeyCard } from './api-key-card'
import { IntegrationCard } from './integration-card'
import { WebhookCard, type DeliveryRow, type WebhookPayload } from './webhook-card'

export interface DeveloperProps {
  /** Exchange origin used for the MCP endpoint and REST examples. */
  baseUrl: string
  /** Current API key if recoverable; otherwise null (revealed only after rotate). */
  apiKey: string | null
  /** The broker's saved webhook URL, pre-filling the form. */
  defaultWebhookUrl: string
  /** The broker's saved signing secret, pre-filling the form. */
  defaultWebhookSecret: string
  /** Whether the saved endpoint is active; defaults to on for a new endpoint. */
  defaultWebhookActive?: boolean
  /** Recent delivery attempts for the broker's endpoint. */
  deliveries: DeliveryRow[]
  /** Rotate handler (defaults to the real server action; overridable in tests). */
  onRotate?: () => Promise<string>
  /** Save handler (defaults to the real server action; overridable in tests). */
  onSaveWebhook?: (payload: WebhookPayload) => void | Promise<void>
}

/**
 * The Developer page body: API key (reveal/rotate), webhook registration and
 * recent deliveries, and the MCP/REST integration reference — organized into
 * tabs so one section shows at a time and the page fits the content region
 * without a tall card stack. Server actions are the defaults; tests can inject
 * their own handlers.
 */
export function Developer({
  baseUrl,
  apiKey,
  defaultWebhookUrl,
  defaultWebhookSecret,
  defaultWebhookActive = false,
  deliveries,
  onRotate = rotateApiKeyAction,
  onSaveWebhook = async (payload: WebhookPayload) => {
    await saveWebhookAction(payload)
  },
}: DeveloperProps) {
  const [tab, setTab] = useUrlState('tab', 'api-key')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="api-key">
          <KeyRound className="size-4" aria-hidden="true" />
          API key
        </TabsTrigger>
        <TabsTrigger value="webhooks">
          <Webhook className="size-4" aria-hidden="true" />
          Webhooks
        </TabsTrigger>
        <TabsTrigger value="mcp-rest">
          <Braces className="size-4" aria-hidden="true" />
          MCP &amp; REST
        </TabsTrigger>
      </TabsList>

      <TabsContent value="api-key">
        <ApiKeyCard apiKey={apiKey} onRotate={onRotate} />
      </TabsContent>

      <TabsContent value="webhooks">
        <WebhookCard
          defaultUrl={defaultWebhookUrl}
          defaultSecret={defaultWebhookSecret}
          defaultActive={defaultWebhookActive}
          deliveries={deliveries}
          onSave={onSaveWebhook}
        />
      </TabsContent>

      <TabsContent value="mcp-rest">
        <IntegrationCard baseUrl={baseUrl} />
      </TabsContent>
    </Tabs>
  )
}

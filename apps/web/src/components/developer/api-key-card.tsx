'use client'

import { useState } from 'react'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Button } from '@decade/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@decade/ui/components/card'

export interface ApiKeyCardProps {
  /** The broker's current key, shown when revealed; null if none is recoverable. */
  apiKey: string | null
  /** Rotate action; returns the fresh plaintext key, which the card then shows. */
  onRotate: () => Promise<string>
}

/** Fixed-width mask so the key's presence reads without leaking its value. */
const MASK = '••••••••••••••••••••••••'

/**
 * The API key panel: shows the broker's key masked by default with a reveal
 * toggle, and a rotate control that calls the rotate action and surfaces the
 * fresh key (revealed, since it is the one moment it is recoverable).
 */
export function ApiKeyCard({ apiKey, onRotate }: ApiKeyCardProps) {
  const [key, setKey] = useState<string | null>(apiKey)
  const [revealed, setRevealed] = useState(false)
  const [rotating, setRotating] = useState(false)

  const handleRotate = async () => {
    setRotating(true)
    try {
      const fresh = await onRotate()
      setKey(fresh)
      setRevealed(true)
    } finally {
      setRotating(false)
    }
  }

  const display = revealed && key ? key : MASK

  return (
    <Card>
      <CardHeader>
        <CardTitle>API key</CardTitle>
        <CardDescription>
          Use this key as a <code>Bearer</code> token against the REST API and the MCP server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <code
          className="block overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm"
          aria-label="API key"
        >
          {display}
        </code>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={revealed}
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
            {revealed ? 'Hide' : 'Reveal'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={rotating}
            onClick={() => void handleRotate()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Rotate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

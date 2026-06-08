'use client'

import { useState } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { Button } from '@decade/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@decade/ui/components/card'
import { useCopy } from '@/lib/use-copy'

export interface ApiKeyCardProps {
  /** A freshly-issued plaintext key to show once, or null when none is in hand. */
  apiKey: string | null
  /** Rotate action; returns the fresh plaintext key, which the card then shows. */
  onRotate: () => Promise<string>
}

/** Placeholder shown when no plaintext key is in hand (the stored key is hashed). */
const MASK = '••••••••••••••••••••••••'

/**
 * The API key panel. The key is stored hashed and is recoverable only at the
 * moment it is issued, so there is nothing to "reveal" for an existing key. The
 * card shows a fresh key exactly once (right after rotate) with a copy control
 * and a one-time warning, and otherwise shows a masked placeholder plus rotate.
 */
export function ApiKeyCard({ apiKey, onRotate }: ApiKeyCardProps) {
  const [freshKey, setFreshKey] = useState<string | null>(apiKey)
  const [rotating, setRotating] = useState(false)
  const { copied, copy, reset } = useCopy()

  const handleRotate = async () => {
    setRotating(true)
    try {
      const next = await onRotate()
      setFreshKey(next)
      reset()
    } finally {
      setRotating(false)
    }
  }

  const handleCopy = async () => {
    if (!freshKey) return
    await copy(freshKey)
  }

  const rotateButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={rotating}
      onClick={() => void handleRotate()}
    >
      <RefreshCw className="size-4" aria-hidden="true" />
      {freshKey ? 'Rotate again' : 'Rotate'}
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>API key</CardTitle>
        <CardDescription>
          Use this key as a <code>Bearer</code> token against the REST API and the MCP server. It is
          stored hashed and shown only once, when you generate it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {freshKey ? (
          <>
            <code
              className="block overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm"
              aria-label="API key"
            >
              {freshKey}
            </code>
            <p className="text-sm text-muted-foreground">
              Copy this now — for security it will not be shown again.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              {rotateButton}
            </div>
          </>
        ) : (
          <>
            <code
              className="block rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground"
              aria-label="API key"
            >
              {MASK}
            </code>
            <p className="text-sm text-muted-foreground">
              Your key is hidden. Rotate to generate a new one — you can copy it once, right after.
            </p>
            {rotateButton}
          </>
        )}
      </CardContent>
    </Card>
  )
}

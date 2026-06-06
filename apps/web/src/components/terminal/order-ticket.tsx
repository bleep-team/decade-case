'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import type { OrderSide, OrderType } from '@decade/types'
import { dollarsToCents } from '@decade/types'
import { Button } from '@decade/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import { Input } from '@decade/ui/components/input'
import { Label } from '@decade/ui/components/label'

/** The order payload the ticket hands to the submit action — money in cents. */
export interface OrderTicketPayload {
  ownerDocument: string
  symbol: string
  side: OrderSide
  type: OrderType
  /** Integer cents for a limit order; null for a market order. */
  limitPrice: number | null
  quantity: number
  /** ISO timestamp, or null for good-till-cancelled. */
  expiresAt: string | null
}

export interface OrderTicketProps {
  /** The active symbol the ticket trades. */
  symbol: string
  /** Default customer document number; pre-filled and editable. */
  defaultOwnerDocument: string
  /** Called with the formed payload on submit. */
  onSubmit: (payload: OrderTicketPayload) => void | Promise<void>
}

/**
 * The order ticket: side (Buy/Sell), type (Limit/Market), quantity, price
 * (disabled for market), expiry, and the owner document. On submit it forms a
 * {@link OrderTicketPayload} — converting the dollar price to integer cents and
 * an empty expiry to null — and hands it to `onSubmit`.
 */
export function OrderTicket({ symbol, defaultOwnerDocument, onSubmit }: OrderTicketProps) {
  const [side, setSide] = useState<OrderSide>('bid')
  const [type, setType] = useState<OrderType>('limit')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [ownerDocument, setOwnerDocument] = useState(defaultOwnerDocument)

  const isMarket = type === 'market'

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const limitPrice = isMarket || price === '' ? null : dollarsToCents(Number(price))
    void onSubmit({
      ownerDocument,
      symbol,
      side,
      type,
      limitPrice,
      quantity: Number(quantity),
      expiresAt: expiresAt === '' ? null : new Date(expiresAt).toISOString(),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Side">
            <Button
              type="button"
              variant={side === 'bid' ? 'default' : 'outline'}
              aria-pressed={side === 'bid'}
              onClick={() => setSide('bid')}
            >
              Buy
            </Button>
            <Button
              type="button"
              variant={side === 'ask' ? 'default' : 'outline'}
              aria-pressed={side === 'ask'}
              onClick={() => setSide('ask')}
            >
              Sell
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Order type">
            <Button
              type="button"
              variant={type === 'limit' ? 'default' : 'outline'}
              aria-pressed={type === 'limit'}
              onClick={() => setType('limit')}
            >
              Limit
            </Button>
            <Button
              type="button"
              variant={type === 'market' ? 'default' : 'outline'}
              aria-pressed={type === 'market'}
              onClick={() => setType('market')}
            >
              Market
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-quantity">Quantity</Label>
            <Input
              id="ticket-quantity"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-price">Price (USD)</Label>
            <Input
              id="ticket-price"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              disabled={isMarket}
              value={isMarket ? '' : price}
              placeholder={isMarket ? 'Market' : undefined}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-expiry">Expiry</Label>
            <Input
              id="ticket-expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-owner">Owner document</Label>
            <Input
              id="ticket-owner"
              value={ownerDocument}
              onChange={(e) => setOwnerDocument(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full">
            <Send className="size-4" aria-hidden="true" />
            Submit order
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

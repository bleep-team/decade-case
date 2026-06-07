'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import type { OrderSide, OrderType } from '@decade/types'
import { dollarsToCents } from '@decade/types'
import { Button } from '@decade/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'
import { Input } from '@decade/ui/components/input'
import { Label } from '@decade/ui/components/label'
import { InfoTip } from './info-tip'

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
  const [errors, setErrors] = useState<{ quantity?: string; price?: string }>({})
  const [pending, setPending] = useState(false)

  const isMarket = type === 'market'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const quantityValue = Number(quantity)
    const priceValue = Number(price)
    const nextErrors: { quantity?: string; price?: string } = {}
    if (quantity === '' || !Number.isFinite(quantityValue) || quantityValue <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than 0.'
    }
    if (!isMarket && (price === '' || !Number.isFinite(priceValue) || priceValue <= 0)) {
      nextErrors.price = 'Enter a price greater than 0.'
    }
    setErrors(nextErrors)
    if (nextErrors.quantity) {
      document.getElementById('ticket-quantity')?.focus()
      return
    }
    if (nextErrors.price) {
      document.getElementById('ticket-price')?.focus()
      return
    }

    setPending(true)
    try {
      await onSubmit({
        ownerDocument,
        symbol,
        side,
        type,
        limitPrice: isMarket ? null : dollarsToCents(priceValue),
        quantity: quantityValue,
        expiresAt: expiresAt === '' ? null : new Date(expiresAt).toISOString(),
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>Order ticket</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <form className="space-y-2" noValidate onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Side">
            <Button
              type="button"
              size="sm"
              variant={side === 'bid' ? 'default' : 'outline'}
              aria-pressed={side === 'bid'}
              onClick={() => setSide('bid')}
            >
              Buy
            </Button>
            <Button
              type="button"
              size="sm"
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
              size="sm"
              variant={type === 'limit' ? 'default' : 'outline'}
              aria-pressed={type === 'limit'}
              onClick={() => setType('limit')}
            >
              Limit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={type === 'market' ? 'default' : 'outline'}
              aria-pressed={type === 'market'}
              onClick={() => setType('market')}
            >
              Market
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="ticket-quantity">Quantity</Label>
              <Input
                id="ticket-quantity"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                aria-invalid={errors.quantity ? true : undefined}
                aria-describedby={errors.quantity ? 'ticket-quantity-error' : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors.quantity ? (
                <p id="ticket-quantity-error" className="text-sm text-destructive">
                  {errors.quantity}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="ticket-price">Price (USD)</Label>
                <InfoTip label="More information">
                  The limit price per share. Market orders take the best available price, so this is
                  disabled for them.
                </InfoTip>
              </div>
              <Input
                id="ticket-price"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                autoComplete="off"
                disabled={isMarket}
                value={isMarket ? '' : price}
                placeholder={isMarket ? 'Market' : '0.00'}
                aria-invalid={errors.price ? true : undefined}
                aria-describedby={errors.price ? 'ticket-price-error' : undefined}
                onChange={(e) => setPrice(e.target.value)}
              />
              {errors.price ? (
                <p id="ticket-price-error" className="text-sm text-destructive">
                  {errors.price}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="ticket-expiry">Expiry</Label>
                <InfoTip label="More information">
                  When the order auto-expires if unfilled. Leave blank to keep it resting until
                  filled or cancelled.
                </InfoTip>
              </div>
              <Input
                id="ticket-expiry"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="ticket-owner">Owner document</Label>
                <InfoTip label="More information">
                  The national ID of the customer the order is placed on behalf of, recorded on the
                  order.
                </InfoTip>
              </div>
              <Input
                id="ticket-owner"
                autoComplete="off"
                spellCheck={false}
                value={ownerDocument}
                onChange={(e) => setOwnerDocument(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" size="sm" className="w-full" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {pending ? 'Submitting…' : 'Submit order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

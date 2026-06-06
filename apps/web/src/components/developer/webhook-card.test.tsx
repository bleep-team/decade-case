import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WebhookCard, type DeliveryRow } from './webhook-card'

afterEach(cleanup)

const deliveries: DeliveryRow[] = [
  {
    id: 'delivery-1',
    url: 'https://example.test/hook',
    tradeId: 'trade-1',
    status: 'delivered',
    attempts: 1,
    createdAt: '2026-06-06T12:00:00.000Z',
  },
]

describe('WebhookCard', () => {
  it('renders the URL and secret fields', () => {
    render(
      <WebhookCard
        defaultUrl="https://example.test/hook"
        defaultSecret="whsec_abc"
        deliveries={deliveries}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/url/i)).not.toBeNull()
    expect(screen.getByLabelText(/secret/i)).not.toBeNull()
  })

  it('renders the deliveries table from data', () => {
    render(
      <WebhookCard defaultUrl="" defaultSecret="" deliveries={deliveries} onSave={vi.fn()} />,
    )
    expect(screen.getByText('trade-1')).not.toBeNull()
    expect(screen.getByText('delivered')).not.toBeNull()
  })

  it('submits the form payload to onSave', () => {
    const onSave = vi.fn()
    render(
      <WebhookCard
        defaultUrl="https://example.test/hook"
        defaultSecret="whsec_abc"
        deliveries={[]}
        onSave={onSave}
      />,
    )
    fireEvent.change(screen.getByLabelText(/url/i), {
      target: { value: 'https://new.test/hook' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith({ url: 'https://new.test/hook', secret: 'whsec_abc' })
  })

  it('shows an empty state with no deliveries', () => {
    render(<WebhookCard defaultUrl="" defaultSecret="" deliveries={[]} onSave={vi.fn()} />)
    expect(screen.getByText(/no deliveries/i)).not.toBeNull()
  })
})

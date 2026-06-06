import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiKeyCard } from './api-key-card'

afterEach(cleanup)

describe('ApiKeyCard', () => {
  it('renders the key masked, not in plaintext', () => {
    render(<ApiKeyCard apiKey="sk_live_secret_value" onRotate={vi.fn()} />)
    expect(screen.queryByText('sk_live_secret_value')).toBeNull()
    expect(screen.getByText(/•/)).not.toBeNull()
  })

  it('reveals the key when the reveal control is used', () => {
    render(<ApiKeyCard apiKey="sk_live_secret_value" onRotate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /reveal/i }))
    expect(screen.getByText('sk_live_secret_value')).not.toBeNull()
  })

  it('rotates via the action and shows the fresh key', async () => {
    const onRotate = vi.fn(async () => 'sk_live_rotated_value')
    render(<ApiKeyCard apiKey="sk_live_secret_value" onRotate={onRotate} />)

    fireEvent.click(screen.getByRole('button', { name: /rotate/i }))

    expect(onRotate).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText('sk_live_rotated_value')).not.toBeNull())
  })
})

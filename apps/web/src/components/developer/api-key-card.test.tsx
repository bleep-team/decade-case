import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiKeyCard } from './api-key-card'

afterEach(cleanup)

describe('ApiKeyCard', () => {
  it('masks the key when none is in hand (the stored key is hashed)', () => {
    render(<ApiKeyCard apiKey={null} onRotate={vi.fn()} />)
    expect(screen.getByText(/•/)).not.toBeNull()
  })

  it('does not offer a reveal control for a hashed key', () => {
    render(<ApiKeyCard apiKey={null} onRotate={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /reveal/i })).toBeNull()
  })

  it('shows the fresh key once after rotating, with a copy control', async () => {
    const onRotate = vi.fn(async () => 'dk_rotated_value')
    render(<ApiKeyCard apiKey={null} onRotate={onRotate} />)

    fireEvent.click(screen.getByRole('button', { name: /^rotate$/i }))

    expect(onRotate).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText('dk_rotated_value')).not.toBeNull())
    expect(screen.getByRole('button', { name: /copy/i })).not.toBeNull()
  })
})

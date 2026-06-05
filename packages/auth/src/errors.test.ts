import { describe, expect, it } from 'vitest'
import { UnauthorizedError } from './errors.js'

describe('UnauthorizedError', () => {
  it('carries a 401 status and a default message', () => {
    const error = new UnauthorizedError()
    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(401)
    expect(error.message).toBe('Authentication required')
    expect(error.name).toBe('UnauthorizedError')
  })

  it('accepts a custom message', () => {
    expect(new UnauthorizedError('no broker').message).toBe('no broker')
  })
})

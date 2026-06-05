/** Thrown when a request reaches a protected handler without an authenticated user. */
export class UnauthorizedError extends Error {
  readonly status = 401

  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

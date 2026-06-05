import { auth, currentUser } from '@clerk/nextjs/server'
import { UnauthorizedError } from './errors.js'

export { auth, currentUser }

/**
 * Resolve the authenticated Clerk user id, throwing `UnauthorizedError` when the
 * request is anonymous. Use at the top of protected route handlers / server
 * actions before resolving the broker.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) {
    throw new UnauthorizedError()
  }
  return userId
}

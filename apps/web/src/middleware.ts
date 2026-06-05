import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Everything under /app is the authenticated broker product; the landing page,
// auth pages, and the broker/MCP/Inngest APIs stay public.
const isProtectedRoute = createRouteMatcher(['/app(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|png|svg|woff2?)).*)', '/(api|trpc)(.*)'],
}

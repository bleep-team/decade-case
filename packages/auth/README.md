# @decade/auth

Clerk authentication helpers.

- `@decade/auth` — `UnauthorizedError`.
- `@decade/auth/server` — re-exports Clerk's `auth` / `currentUser`, plus
  `requireUserId()` which throws `UnauthorizedError` for anonymous requests.

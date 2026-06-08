/**
 * Rebuild a request whose URL reflects the *public* origin the client reached,
 * from the `x-forwarded-host` / `x-forwarded-proto` headers a reverse proxy or
 * tunnel sets. Handlers that derive a URL from `req.url` (e.g. RFC 9728
 * resource metadata) otherwise advertise the internal origin — `localhost`
 * behind cloudflared, the container host behind a load balancer — which breaks
 * OAuth resource/audience matching for clients that reached the public URL.
 *
 * When no `x-forwarded-host` is present (a direct request) the original request
 * is returned untouched, so direct and proxied access behave identically.
 */
export function publicOriginRequest(req: Request): Request {
  const forwardedHost = req.headers.get('x-forwarded-host')
  if (!forwardedHost) {
    return req
  }
  const url = new URL(req.url)
  // A chain of proxies may append hosts; the first is the client-facing one.
  const [hostname, port] = forwardedHost.split(',')[0]!.trim().split(':')
  // Set hostname/port separately: assigning `url.host` without a port leaves
  // the original port in place, so an unported forwarded host must clear it.
  url.hostname = hostname!
  url.port = port ?? ''
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (proto) {
    url.protocol = `${proto}:`
  }
  return new Request(url, req)
}

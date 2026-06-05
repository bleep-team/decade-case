import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@decade/ui'],
  // Linting runs as its own Turborepo task (`pnpm lint`); skip Next's duplicate
  // pass during `next build` so it doesn't require the eslint-plugin-next.
  eslint: { ignoreDuringBuilds: true },
  // `pg` is Node-only; keep webpack from bundling it into the server output so
  // it loads as a normal Node module.
  serverExternalPackages: ['pg'],
}

export default nextConfig

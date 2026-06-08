import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@decade/ui'],
  // Linting runs as its own Turborepo task (`pnpm lint`); skip Next's duplicate
  // pass during `next build` so it doesn't require the eslint-plugin-next.
  eslint: { ignoreDuringBuilds: true },
  // Keep Node-only / runtime-patching packages out of the webpack bundle so they
  // load as normal Node modules. `pg` is Node-only; the Inngest + OpenTelemetry
  // stack (pulled in transitively by @decade/exchange-runtime) monkey-patches
  // modules at require time, which webpack can't bundle cleanly — externalizing
  // it also silences the "Critical dependency" warnings it emits on every
  // recompile of the /api/inngest route.
  serverExternalPackages: [
    'pg',
    'inngest',
    '@inngest/realtime',
    'require-in-the-middle',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/instrumentation',
    '@traceloop/instrumentation-anthropic',
  ],
  webpack: (config) => {
    // Residual, harmless warnings from the OpenTelemetry instrumentation tree:
    // dynamic requires in require-in-the-middle, and an optional winston
    // transport we don't install. They come entirely from node_modules.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /require-in-the-middle/ },
      { module: /@opentelemetry\/instrumentation/ },
      { message: /Can't resolve '@opentelemetry\/winston-transport'/ },
    ]
    return config
  },
}

export default nextConfig

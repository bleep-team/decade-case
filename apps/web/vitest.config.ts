import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import-x/no-default-export -- vitest config requires a default export
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    exclude: ['node_modules', 'dist', '.next', 'e2e/**'],
    // Route tests boot the in-process pglite harness in `beforeAll`; the cold
    // WASM Postgres init can exceed Vitest's default 10s hook timeout in CI.
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
})

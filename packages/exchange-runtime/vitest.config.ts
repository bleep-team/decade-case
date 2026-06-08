import { defineConfig } from 'vitest/config'

// The in-process pglite (WASM Postgres) harness boots and migrates inside a
// `beforeAll`, which can exceed Vitest's default 10s hook timeout on a cold CI
// runner. Give the harness room so the suite is not flaky under load.
// eslint-disable-next-line import-x/no-default-export -- vitest config requires a default export
export default defineConfig({
  test: {
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
})

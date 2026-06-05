import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import-x/no-default-export -- vitest config requires a default export
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
  },
})

import { nextjs } from '@decade/eslint-config'

export default [
  ...nextjs,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
]

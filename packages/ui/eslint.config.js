import { base } from '@decade/eslint-config'

export default [
  ...base,
  {
    files: ['**/components/**/*.tsx'],
    rules: {
      // React components are conventionally the default export of their file.
      'import-x/no-default-export': 'off',
    },
  },
]

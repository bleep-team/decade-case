import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import-x'

/** @type {import('eslint').Linter.Config[]} */
export const base = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import-x': importPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import-x/no-default-export': 'error',
    },
  },
]

/** Next.js config — allows default exports for pages/layouts */
export const nextjs = [
  ...base,
  {
    files: [
      '**/app/**/page.{ts,tsx}',
      '**/app/**/layout.{ts,tsx}',
      '**/app/**/loading.{ts,tsx}',
      '**/app/**/error.{ts,tsx}',
      '**/app/**/not-found.{ts,tsx}',
      '**/app/**/template.{ts,tsx}',
      '**/app/**/default.{ts,tsx}',
      '**/app/**/route.{ts,tsx}',
      '**/app/**/sitemap.{ts,tsx}',
      '**/app/**/robots.{ts,tsx}',
      '**/app/**/opengraph-image.{ts,tsx}',
      '**/next.config.{js,ts,mjs}',
      '**/middleware.{ts,tsx}',
    ],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
]

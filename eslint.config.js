import { nextjs } from '@decade/eslint-config'

// Root config used by lint-staged from repo root.
// `nextjs` extends `base` with overrides for Next.js framework files
// (page/layout/loading/error/etc must have default exports). The override
// only matches files inside `**/app/**`, so non-Next.js packages still get
// the strict `import-x/no-default-export` rule.
export default nextjs

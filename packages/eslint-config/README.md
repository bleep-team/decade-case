# @decade/eslint-config

Shared ESLint flat config for the Decade Exchange monorepo.

## Features

- TypeScript recommended rules
- No `any` types (`@typescript-eslint/no-explicit-any: error`)
- No default exports (`import-x/no-default-export: error`)
- Unused variables as errors

## Usage

```js
// eslint.config.js
import { base } from '@decade/eslint-config'

export default [...base]
```

For Next.js apps (allows default exports for pages/layouts):

```js
import { nextjs } from '@decade/eslint-config'

export default [...nextjs]
```

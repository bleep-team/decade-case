# @decade/typescript-config

Shared TypeScript configurations for the Decade Exchange monorepo.

## Configs

- `base.json` — Base config with strict mode and modern module resolution
- `react.json` — Extends base with JSX and DOM types for React apps
- `library.json` — Extends base with declaration maps and composite builds for libraries

## Usage

```json
{
  "extends": "@decade/typescript-config/base.json"
}
```

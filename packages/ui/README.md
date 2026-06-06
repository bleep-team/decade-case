# @decade/ui

Shared **shadcn/ui** design system for Decade Exchange. Tailwind v4 with
CSS-first tokens, shadcn monorepo layout, subpath exports. Consumed via Next's
`transpilePackages` (ships `.tsx`/`.ts` directly, no build step), so internal
imports are extensionless.

## Layout

```
packages/ui/
├── components.json        # shadcn CLI config (style: new-york, baseColor: neutral)
├── src/
│   ├── components/        # shadcn-CLI components
│   ├── hooks/             # shared React hooks
│   ├── lib/utils.ts       # cn() helper (clsx + tailwind-merge)
│   └── styles/globals.css # @theme tokens (single dark theme)
```

## Usage

Subpath imports — apps bundle only what they use:

```tsx
import { Button } from '@decade/ui/components/button'
import { Card, CardHeader, CardTitle } from '@decade/ui/components/card'
import { cn } from '@decade/ui/lib/utils'
```

Import the global styles once in the app's root layout, and set the theme:

```tsx
import '@decade/ui/styles/globals.css'
// <html className="dark"> — the app runs a single dark theme
```

## Theme

`src/styles/globals.css` declares two layers in `@theme`:

- **Raw brand tokens** — `--ink`, `--paper`, `--silver` (usable as `bg-ink`,
  `text-paper`, `border-silver`).
- **Semantic shadcn tokens** — `--background`, `--foreground`, `--primary`,
  `--ring`, … aliased to the brand. Use these in components: `bg-primary`,
  `text-muted-foreground`, `border-border`.

The brand is a minimalist black / white / silver palette and runs as a
**single dark theme** — there is no light mode (see ADR 0006).

## Adding components

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component>
```

Components land in `src/components/` and are exported automatically via the
subpath `exports` map in `package.json`.

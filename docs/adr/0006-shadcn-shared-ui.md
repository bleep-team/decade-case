# 0006 — shadcn/ui in the shared UI package

**Status:** Accepted
**Date:** 2026-06-05

## Context

Decade Exchange needs a consistent, sophisticated design system across the
landing page and the broker dashboard (and any future app). shadcn/ui copies
component source into the repo rather than installing a black-box library, which
gives us full control over markup, styling, and brand. We also want one source
of truth so a brand change propagates to every consumer.

## Decision

Initialize shadcn/ui **inside `packages/ui/`** (not in the app), exactly as the
upstream shadcn monorepo layout prescribes. All apps consume `@decade/ui` for
components and the shared Tailwind theme.

- `packages/ui/components.json` configures the CLI (`style: new-york`,
  `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`, aliases →
  `@decade/ui/*`). Add components with `cd packages/ui && pnpm dlx shadcn@latest add <name>`.
- Components are exported via the subpath `exports` map in `package.json`
  (`./components/*`, `./hooks/*`, `./lib/*`, `./styles/globals.css`), so an app
  imports only what it uses: `import { Button } from '@decade/ui/components/button'`.
- Design tokens live CSS-first in `packages/ui/src/styles/globals.css` via
  Tailwind v4 `@theme`: a raw neutral brand layer (`--ink`, `--paper`,
  `--silver`), a single warm accent (`--brand`, `#f0a868`), market-data tokens
  (`--gain`/`--loss`), and the semantic shadcn aliases (`--background`,
  `--foreground`, `--primary`, `--ring`, …). Apps import that one stylesheet and
  inherit everything.
- **Single dark theme, no light mode.** The brand is a monochrome dark palette —
  near-black ink to near-white paper, graded silver — lifted by the warm orange
  `--brand` accent used sparingly (active nav, key identifiers). The dark tokens
  are authored once and the app root sets `<html class="dark">` with
  `color-scheme: dark`. There is no white-label or light-mode support in v1.
- **One typeface: Inter.** `apps/web/src/app/layout.tsx` loads only Inter (sans;
  numbers use the Tailwind `font-mono` stack). The editorial serif (Playfair) was
  dropped — it sat on a single heading and read as an inconsistent font.
- The embedded Clerk components are brand-aligned via the `appearance` prop in
  `layout.tsx`: the `dark` base theme as a backstop, with `variables` pinned to
  the same `@decade/ui` design tokens, so the auth UI tracks the palette with no
  second source of truth.

## Consequences

- One place to apply brand or design-system updates; no drift between the landing
  and the dashboard, or between future apps.
- We own the components — upstream shadcn updates require manual reapplication.
- Dropping light mode keeps the token layer simple, at the cost of re-architecting
  it later if a light theme is ever needed.
- `calendar` is intentionally omitted: its registry template lags the installed
  `react-day-picker` v10 API. Re-add it (pinning a compatible day-picker) only if
  a date surface is needed.

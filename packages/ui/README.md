# @decade/ui

A small Tailwind-based design system. Consumed via Next's `transpilePackages`
(ships `.tsx`/`.ts` directly, no build step), so internal imports are extensionless.

- `@decade/ui/lib/utils` → `cn()` (clsx + tailwind-merge)
- `@decade/ui/components/button` → `Button`
- `@decade/ui/styles/globals.css` → Tailwind entry + theme tokens

> **Skills:** Use `/monorepo-management` and `/turborepo` when creating or restructuring packages.

When creating a new package:

1. Create it under `packages/<name>/`
2. Initialize `package.json` with name `@decade/<name>`
3. Add `tsconfig.json` extending `@decade/typescript-config/library.json`
4. Add `README.md` with a brief description
5. Create `src/index.ts` as the entry point (named exports only)
6. Create `src/index.test.ts` with at least one Vitest test
7. Use tsup for builds (`tsup src/index.ts --format esm --dts`)
8. Run `pnpm install` — the package is auto-detected by workspace globs
9. Add the package directory name to `commitlint.config.js` → `scope-enum` array

Internal libraries import each other with `.js` specifiers (ESM/tsup output).
The `@decade/ui` package is the exception — it is consumed via Next's
`transpilePackages` (not built), so its internal imports are extensionless.

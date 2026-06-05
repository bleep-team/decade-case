import { defineConfig } from 'drizzle-kit'

// Keep this config dependency-free beyond drizzle-kit: it is loaded through
// bundle-require, which chokes on Node-builtin / CommonJS imports. `db:generate`
// only diffs the schema and needs no connection; `db:migrate` is a separate
// `tsx src/migrate.ts` that loads `../.env` itself.
// eslint-disable-next-line import-x/no-default-export -- drizzle-kit CLI requires a default export
export default defineConfig({
  schema: './src/schema/tables.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
})

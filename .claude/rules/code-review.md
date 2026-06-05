> **Skills:** Use `/tdd` when writing tests, `/ubiquitous-language` when checking terminology.

When reviewing or writing code:

- Check TypeScript strict-mode compliance; no `any` without a justifying comment
- Money is always integer **cents** (`Cents`) — never floats, never dollars in logic
- Keep the `@decade/matching-engine` package **pure** (no clock, no db, no ids) so
  it stays exhaustively unit-testable
- Verify tests exist for new functionality; tests read as sentences
- Exports are named, not default (except Next pages/layouts/route handlers/config)
- Cross-package imports use package names, not relative paths
- Use canonical terms from `UBIQUITOUS_LANGUAGE.md` (Bid/Ask, Order, Trade, Book…)

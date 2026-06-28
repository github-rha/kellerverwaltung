Code style uses ESLint + Prettier with SvelteKit defaults:

- Tabs for indentation
- Single quotes
- No trailing semicolons
- Do not override or disable ESLint/Prettier rules
- Run `npm run lint`, `npm run format`, and `npm run check` before considering code complete
- `npm run check` (svelte-check) is mandatory: it is the only step that type-checks. Type errors are invisible to ESLint and to Vitest, but CI runs it and will fail without it

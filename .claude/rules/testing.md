Testing uses Vitest. Run tests from the app/ directory with `npm test`.

- Every new function in the data layer must have unit tests
- Use `fake-indexeddb` for persistence tests, not mocks
- Test names describe the behavior, not the implementation (e.g. "increments bottle count by 1", not "calls adjustCount with +1")
- No test should depend on another test's state — each test sets up its own data
- Run `npm test` before considering code complete

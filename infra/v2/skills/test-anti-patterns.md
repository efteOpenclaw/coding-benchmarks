---
name: test-anti-patterns
description: Common testing mistakes that cause rubric penalties — snapshot abuse, testing implementation details, assertion-free tests, hardcoded IDs, shared mutable state. Use during test review or when tests feel wrong.
globs: "**/*.test.ts,**/*.test.tsx"
---

# Test Anti-Patterns — Avoid These

| Anti-Pattern | Why it hurts | Do this instead |
|---|---|---|
| **Snapshot everything** | Nobody reads 500-line diffs; snapshots get blindly updated | Specific assertions on values/text |
| **Testing implementation details** | 40 tests break on internal refactor | Test through public API / user-visible behavior |
| **Shared mutable state** | Flaky, order-dependent | Factory per test, clean DB per test |
| **`expect(true).toBe(true)`** | Proves nothing | Assert on actual return values or DOM state |
| **No assertions in test body** | Silent false pass | Every `it()` must have at least one `expect()` |
| **Hardcoded test IDs** | Hidden coupling between tests | Use factory `randomUUID()`, never `"user-1"` |
| **Only happy paths** | Bugs hide in error paths | Test auth (401), validation (400), not-found (404) for every route |
| **Mocking what you're testing** | Proves nothing | Use real DB with `:memory:`, real bcrypt |
| **`console.log` debugging left in** | Rubric penalty | Remove all console from source before finishing |

## When to mock vs use real

```
ALWAYS REAL: Zod schemas, DB queries (use :memory:), bcrypt, pure functions
MOCK THESE:  External HTTP (use MSW), time (vi.useFakeTimers), auth sessions (only if sealData doesn't work)
NEVER MOCK:  The thing you're testing
```

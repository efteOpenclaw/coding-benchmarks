# Rules: Test Files (*.test.ts, *.test.tsx)

## Structure

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Module', () => {
  beforeEach(() => { /* seed DB or render component */ });
  afterEach(() => { /* close DB or cleanup */ });

  describe('specific function or route', () => {
    it('describes the expected behavior', () => {
      // Arrange → Act → Assert
    });
  });
});
```

## Rules

1. **Colocate with source.** `thing.ts` → `thing.test.ts` in the same directory. Never a separate `__tests__/` directory.
2. **In-memory SQLite for DB tests.** `getDb(':memory:')` in beforeEach, `closeDb()` in afterEach.
3. **Assert behavior, not implementation.** Check response shapes, status codes, rendered text. Never check internal state or method calls on the thing being tested.
4. **Use `vi.fn()` for callback spies.** Assert `toHaveBeenCalledWith(expect.objectContaining({...}))`.
5. **Use @testing-library query priority.** `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (last resort).
6. **Test categories per route/component:**
   - Auth: 401 without session
   - Validation: 400 for invalid input
   - Happy path: correct status + response shape
   - Not found: 404 for missing resources
   - Edge cases: empty input, boundary values, null fields
7. **No `expect(true).toBe(true)`.** Every assertion must verify meaningful behavior.
8. **No shared mutable state between tests.** Each test sets up and tears down independently.
9. **Use `it.each()` for parameterized tests** — boundary values, invalid enums, etc.

## Before writing tests

Read `templates/api-route.test.ts` or `templates/component.test.tsx` depending on what you're testing.

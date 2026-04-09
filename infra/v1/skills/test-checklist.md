---
name: test-checklist
description: Test quality review checklist, anti-patterns to avoid, and coverage strategy. Use during self-review (Phase 5) or when reviewing test quality. Covers anti-patterns table, coverage thresholds, and the pre-flight verification checklist.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Test Checklist — Review & Anti-Patterns

Use this skill during self-review to verify test quality. Run through every item before marking tests as complete.

---

## 1. Anti-Patterns to Avoid

| Anti-Pattern | Why it hurts | Do this instead |
|---|---|---|
| **Snapshot everything** | Nobody reads 500-line diffs; snapshots get blindly updated | Use specific assertions; inline snapshots only for small outputs |
| **Testing implementation details** | 40 tests break on internal refactor | Test through public API/user-visible behavior |
| **Shared mutable state** | Flaky tests, order-dependent failures | Factory per test, clean DB per test |
| **`console.log` in production** | Noise in test output; rubric penalty | Remove all console statements from source |
| **Unused test dependencies** | Rubric penalty; bundle bloat | Audit package.json; remove what you don't use |
| **Only testing happy paths** | Bugs hide in error paths | Test auth, validation, not-found, conflict for every endpoint |
| **`expect(true).toBe(true)`** | Proves nothing | Assert on actual return values or DOM state |
| **No assertions in test body** | Test passes but verifies nothing — silent false pass | Every `it()` block must contain at least one `expect()` call |
| **Hardcoded test IDs** | Hidden coupling between tests; breaks isolation | Use factory functions — never write `createUser("user-1", ...)` |
| **Giant test files (300+ lines)** | Hard to navigate, slow to run | Split by describe block or by scenario |
| **Interdependent tests** | One failure cascades to false failures | Each test is independent; own data, own setup |

---

## 2. Coverage Strategy

Set thresholds on critical paths, not vanity metrics:

```typescript
// vitest.config.ts → test.coverage
coverage: {
  thresholds: {
    statements: 70,
    branches: 65,
  },
  "src/lib/auth*": { statements: 90, branches: 85 },
  "src/lib/db*": { statements: 85, branches: 80 },
}
```

**Branch coverage** is the most valuable metric — it tells you whether error paths and edge cases are tested.

**Never chase 100% globally.** It leads to testing getters and framework boilerplate.

---

## 3. Pre-Flight Checklist

Before marking tests as complete, verify every item:

```
□ All tests pass: npx vitest run --reporter=verbose
□ Every it() block contains at least one expect() assertion (no empty tests)
□ No console.log/console.error in source code (only in test helpers if needed)
□ Tests are colocated with source files (no __tests__/ directories)
□ Every API route has auth, validation, happy path, and error tests
□ Component tests use getByRole/getByLabelText (not getByTestId)
□ Component tests use userEvent (not fireEvent)
□ Assertions verify behavior and contracts, not implementation
□ No shared mutable test data between tests
□ Test names read as behavior specifications
□ Factory functions created AND actually imported/used in tests
□ No hardcoded test IDs — factories generate unique IDs
□ DB tests use in-memory or transaction rollback for isolation
□ No unused test dependencies in package.json (run dep audit script)
□ At least one a11y check (axe) per component
```

### How to verify empty tests

```bash
# Find test files with it() blocks that have no expect()
# Each it() block should have at least one expect
grep -n "it(" src/**/*.test.* | head -20
# Then spot-check each test has assertions
```

### How to verify factories are used

```bash
# If factories.ts exists, it should be imported
if [ -f tests/helpers/factories.ts ]; then
  grep -r "from.*factories" src/ tests/ --include="*.test.*" || echo "WARNING: factories.ts exists but is never imported"
fi
```

### How to verify unused deps

```bash
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -r "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx" -q && \
     ! grep -r "require(['\"]${dep}" src/ --include="*.ts" --include="*.tsx" -q; then
    echo "UNUSED: ${dep}"
  fi
done
```

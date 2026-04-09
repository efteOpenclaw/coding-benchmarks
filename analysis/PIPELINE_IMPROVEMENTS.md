# Pipeline Improvements — Lessons from Mixed Pipeline + All P1 Runs

Apply these to P2 and P3 runs. These are the specific gaps that cost points across architectures.

---

## 1. Test writer must enforce EXACT field selection, not just exclusion

**Problem:** Tests check `not.toHaveProperty('password_hash')` — spread destructuring passes this. Builder uses `{ password_hash: _, ...rest }` which leaks any future sensitive field.

**Fix for test writer prompt:** Add this instruction:
```
For auth responses (register, login, me), assert EXACT fields:
  expect(Object.keys(json.data.user).sort()).toEqual(['created_at', 'email', 'id'])
Not just: expect(json.data.user).not.toHaveProperty('password_hash')
```

**Why exact > exclusion:** Exclusion-based checks pass today but break silently when schema changes. Exact field lists catch both current and future leaks.

---

## 2. Test writer must include error boundary / app-level tests

**Problem:** No test for error.tsx → builder doesn't create it. `next build` passes without error boundaries.

**Fix for test writer prompt:** Add:
```
Include a meta-test or file-existence test:
  it('error boundaries exist', () => {
    expect(existsSync('src/app/error.tsx')).toBe(true);
  });
```

Or add to compliance meta-tests:
```
it('app has error boundaries', () => {
  const errorFiles = findFiles(SRC, ['.tsx']).filter(f => f.endsWith('/error.tsx'));
  expect(errorFiles.length).toBeGreaterThanOrEqual(1);
});
```

---

## 3. Planner must include error boundaries and DX in the file tree

**Problem:** PLAN.md didn't mention error.tsx. Builder only builds what's in the plan.

**Fix for planner prompt:** Add explicit checklist:
```
Your PLAN.md MUST include:
- src/app/error.tsx (root error boundary with 'use client' + reset)
- .env.example with all required env vars
- .gitignore
- These are non-negotiable regardless of spec
```

---

## 4. Build prompt should have an "untested requirements" section

**Problem:** Tests drive implementation. Untested features don't get built. But some features can't be easily tested (error boundaries, SSR patterns, layout structure).

**Fix:** Add to the build-against-tests prompt:
```
AFTER all tests pass, also create these (not covered by tests):
- src/app/error.tsx — error boundary with 'use client' and reset button
- src/app/[section]/error.tsx — nested error boundary for each route group
- Verify: npx next build succeeds
- Verify: All pages render without errors
```

---

## 5. Cookie header assertions need session implementation awareness

**Problem:** Tests assert `res.headers.get('set-cookie')` but iron-session's `session.save()` in route handlers doesn't always set headers on the raw Response in test context. Some runs pass this, others don't — depends on how session is implemented.

**Fix for test writer:** Either:
- Accept that cookie testing is indirect (test session state, not headers), OR
- Include a helper that manually seals + sets the cookie, and test that pattern

---

## 6. For P2: test writer must cover domain-specific features

**P2 gaps the test writer needs to cover:**
- Revision ordering: `ORDER BY created_at DESC` — test that latest revision is first
- Restore creates NEW revision (not mutation): assert revision count increases by 1
- Lock conflict: POST when already locked returns 409 with CONFLICT code
- Lock expiry: expired lock can be re-acquired
- Search: returns matches by title AND content, empty for no matches
- Tree depth: reject parent_id that would exceed max depth 5
- Slug uniqueness: duplicate title generates different slug
- WebSocket: at minimum, verify server.ts exists and exports are correct

---

## 7. For P2: planner must specify PostgreSQL patterns explicitly

**Problem:** Previous P2 runs used SQLite because templates showed SQLite.

**Fix:** The plan must include:
```
## Database: PostgreSQL via pg (NOT SQLite)
- Pool (not single client)
- Async queries (await pool.query)
- $1, $2, $3 parameterization (NOT ?)
- NOW() for timestamps (NOT datetime('now'))
- TIMESTAMPTZ columns (NOT TEXT)
- Transactions for multi-table writes (BEGIN/COMMIT/ROLLBACK)
```

---

## 8. Meta-test additions for P2

```typescript
// P2-specific compliance tests
it('uses pg Pool, not better-sqlite3', () => {
  const dbContent = readSafe(join(SRC, 'lib/db.ts'));
  expect(dbContent).toContain('from \'pg\'');
  expect(dbContent).not.toContain('better-sqlite3');
});

it('all DB functions are async', () => {
  const dbContent = readSafe(join(SRC, 'lib/db.ts'));
  const exportedFunctions = dbContent.match(/export (async )?function \w+/g) || [];
  const nonAsync = exportedFunctions.filter(f => !f.includes('async'));
  // Allow getPool/setPool/closePool to be sync
  const violations = nonAsync.filter(f => !/(getPool|setPool|closePool)/.test(f));
  expect(violations).toEqual([]);
});

it('stores both markdown and HTML in revisions', () => {
  const dbContent = readSafe(join(SRC, 'lib/db.ts'));
  expect(dbContent).toContain('content_markdown');
  expect(dbContent).toContain('content_html');
});
```

---

## 9. Reduce spread destructuring via meta-test

Add to compliance meta-tests:
```typescript
it('no spread destructuring on DB rows in route handlers', () => {
  const violations: string[] = [];
  for (const file of findFiles(join(SRC, 'app/api'), ['.ts'])) {
    if (file.includes('.test.')) continue;
    const content = readSafe(file);
    if (/\.\.\.(user|row|rest|result)/.test(content)) {
      violations.push(file);
    }
  }
  expect(violations, 'Route handlers using spread on DB rows').toEqual([]);
});
```

---

## Summary: Priority order for P2

1. **Exact field selection assertion** (prevents spread destructuring) — highest impact
2. **Error boundary existence test** (prevents missing error.tsx) — easy win  
3. **PostgreSQL-specific meta-tests** (prevents wrong DB engine) — P2-critical
4. **Domain feature tests** (revisions, locks, search, tree depth) — P2-specific
5. **Untested requirements section** in build prompt — catches what tests miss
6. **Planner checklist** for non-functional requirements — error boundaries, env, gitignore

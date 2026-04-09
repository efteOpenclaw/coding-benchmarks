# Hybrid Build — Task Manager (P1)

Combines the best from our highest-scoring runs:
- pchunked's simple QA→Builder cycle (93, most efficient)
- Meta-tests for self-enforcing compliance (94, fixed factory bypass)
- Adversarial test patterns for deeper assertions (237 tests, best test quality)

You build this project in 7 chunks. For each chunk:
1. **QA**: Write tests for this chunk first
2. **Builder**: Implement code to make those tests pass

Complete each chunk (tests green) before starting the next.

All files go in the current working directory. Create `BUILD_LOG.md` immediately.

## CRITICAL RULES (always active)

1. Zero `any` types
2. Zero console statements — use `throw` for startup errors
3. Always `.safeParse()` — never `.parse()`
4. Always use response helpers — never manual `Response.json`
5. Always whitelist column names for dynamic SQL
6. Colocate tests with source files
7. Every test file imports from factories — never hardcode test data
8. Meta-tests enforce rules 1-7 automatically — they fail if you violate them

---

## Chunk 0: Project Setup + Meta-Tests

```bash
npm init -y
npm install next@14 react react-dom typescript better-sqlite3 iron-session bcryptjs zod
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom @types/node @types/better-sqlite3 @types/bcryptjs jsdom tailwindcss autoprefixer postcss
```

Create: `tsconfig.json` (strict, paths), `vitest.config.ts`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`.

Read `~/skills/test-factories.md`, then create:
- `tests/helpers/setup.ts` — jest-dom, cleanup
- `tests/helpers/factories.ts` — `buildUser`, `createUserInDb`, `buildTask`, `createTaskInDb`
- `tests/helpers/auth.ts` — `createAuthCookie()` using sealData

Read `~/skills/meta-tests.md`, then create:
- `tests/meta/compliance.test.ts` — self-enforcing guardrails

Run `npx vitest run` — meta-tests should pass (no source files = no violations).

---

## Chunk 1: Validators + Response Helpers

### QA role
Read `~/skills/test-error-paths.md`. Write:
- `src/lib/validators.test.ts` — all schemas: valid, invalid, boundary values with `it.each`:
  - Email: empty, invalid, 255 chars (pass), 256 chars (fail), trim, toLowerCase
  - Password: 7 chars (fail), 8 chars (pass), 128 chars (pass), 129 chars (fail)
  - Title: empty (fail), 1 char (pass), 200 chars (pass), 201 chars (fail), whitespace-only (fail)
  - Description: 5000 chars (pass), 5001 chars (fail)
  - Due date: regex `YYYY-MM-DD`, null (pass), empty string (fail)
  - Status/priority: each valid value, invalid values, case-sensitive
- `src/lib/api-response.test.ts` — both helpers: status codes, response shapes

Run `npx vitest run src/lib/`. Tests MUST fail (no implementation). Log count.

### Builder role
Read `~/templates/validator.ts`, `~/templates/api-response.ts`, `~/skills/zod-validation.md`, `~/skills/response-shaping.md`. Implement:
- `src/lib/validators.ts`
- `src/lib/api-response.ts`

Run `npx vitest run src/lib/`. **All must pass.** Log results.

---

## Chunk 2: Database Layer

### QA role
Read `~/skills/test-api-routes.md`. Write:
- `src/lib/db.test.ts` — CRUD, filters, sort, ownership scoping, constraints, FK enforcement, UPDATABLE_COLUMNS whitelist test (reject id, user_id, created_at)

Tests must import from `@tests/helpers/factories`. Run tests — must fail.

### Builder role
Read `~/templates/db-query.ts`, `~/skills/sql-safety.md`, `~/skills/authorization.md`. Implement:
- `src/lib/db.ts` — singleton, WAL, foreign keys, all user + task functions, `UPDATABLE_COLUMNS` whitelist, `SORT_MAP` whitelist, composite indexes on `(user_id, status)` and `(user_id, priority)`

Run `npx vitest run src/lib/db.test.ts`. **All must pass.**

---

## Chunk 3: Session + Auth Routes

### QA role
Read `~/skills/test-api-routes.md`, `~/skills/test-error-paths.md`. Write tests with these SPECIFIC assertions:

**Register** (`src/app/api/auth/register/route.test.ts`):
- 201 on success
- 400 for each invalid field
- 409 for duplicate email (case-insensitive)
- Response has NO password_hash: `expect(json.data.user).not.toHaveProperty('password_hash')`
- Response has EXACT fields: `expect(Object.keys(json.data.user).sort()).toEqual(['created_at', 'email', 'id'])`
- Sets session cookie: `expect(res.headers.get('set-cookie')).toContain('app-session')`

**Login** (`src/app/api/auth/login/route.test.ts`):
- 200 on success
- 401 wrong email, 401 wrong password
- **SAME error message for both**: assert both return `'Invalid email or password'`
- Sets session cookie: `expect(res.headers.get('set-cookie')).toContain('app-session')`
- Response has NO password_hash

**Logout** (`src/app/api/auth/logout/route.test.ts`):
- 200, clears cookie

**Me** (`src/app/api/auth/me/route.test.ts`):
- 200 with EXACT fields (id, email, created_at only)
- 401 without auth
- Response has NO password_hash

Tests must use `createUserInDb()` and `createAuthCookie()`. Run — must fail.

### Builder role
Read `~/templates/session.ts`, `~/templates/api-route.ts`, `~/skills/session-auth.md`, `~/skills/api-route-pattern.md`. Implement:
- `src/lib/session.ts`
- All 4 auth route files

**Explicit field selection** in responses: `{ id: user.id, email: user.email, created_at: user.created_at }`. Never spread.
`await bcrypt.hash` (async, not hashSync).

Run all auth tests. **All must pass.**

---

## Chunk 4: Task Routes

### QA role
Read `~/skills/test-api-routes.md`, `~/skills/test-error-paths.md`. Write:
- `src/app/api/tasks/route.test.ts` — GET: 401, filters, sort, empty, ownership isolation. POST: 401, 201 with defaults, 400 each invalid field, boundary values
- `src/app/api/tasks/[id]/route.test.ts` — GET: 401, 200, 404 missing, **404 wrong user (NOT 403)**: `expect(res.status).toBe(404); expect(res.status).not.toBe(403)`. PATCH: 401, 200, 404, 400 invalid, partial update preserves other fields. DELETE: 401, 200, 404 wrong user

Tests must use factories + auth cookies. Run — must fail.

### Builder role
Read `~/templates/api-route.ts`, `~/skills/api-route-pattern.md`, `~/skills/authorization.md`. Implement:
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/[id]/route.ts`

Run all task tests. **All must pass.** Also re-run auth tests — no regressions.

---

## Chunk 5: Components

### QA role
Read `~/skills/test-components.md`. Write tests for:
- `AuthForm` — renders fields, submit, error state, loading state (disabled button)
- `TaskForm` — renders fields, submit with data, cancel, validation, loading
- `TaskItem` — renders title/priority/status, edit button, delete callback, **overdue highlight** (past date + todo), **no highlight when done**
- `TaskList` — renders tasks, empty state
- `FilterBar` — renders dropdowns, fires filter change, current values
- `ConfirmDialog` — renders message, confirm/cancel buttons

Run — must fail.

### Builder role
Read `~/templates/component.tsx`, `~/skills/component-patterns.md`. Implement all 6 components.
Typed Props interfaces. Named exports. `'use client'`. `htmlFor` + `id`. Tailwind only. Double-submit prevention (`isSubmitting` state).

Run all component tests. **All must pass.**

---

## Chunk 6: Pages + Layout

### Builder role (no QA — pages validated by build)
Read `~/skills/component-patterns.md`, `~/skills/error-boundaries.md`. Create:
- `src/app/layout.tsx` — root layout, imports globals.css
- `src/app/page.tsx` — redirect based on auth
- `src/app/login/page.tsx`, `src/app/register/page.tsx`
- `src/app/tasks/page.tsx` — server component, auth guard
- `src/app/tasks/TasksClient.tsx` — client component, full CRUD + filter + sort
- `src/app/error.tsx`, `src/app/tasks/error.tsx` — error boundaries with 'use client' + reset

Run `npx next build`. **Must succeed.** Run `npx vitest run`. All previous tests still pass.

---

## Chunk 7: DX + Final Validation

Read `~/skills/dx-setup.md`, `~/skills/env-config.md`, `~/skills/pre-flight-security.md`, `~/skills/anti-patterns-code.md`, `~/skills/anti-patterns-deps.md`.

Create: `.env.example`, `.gitignore`, `README.md`.

Run full validation:
```bash
npx vitest run --reporter=verbose
npx tsc --noEmit
npx next build

# Dep audit — remove anything unused
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -rq "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx"; then
    echo "UNUSED: ${dep}" && npm uninstall ${dep}
  fi
done
```

**Everything must pass. Log final summary in BUILD_LOG.md.**

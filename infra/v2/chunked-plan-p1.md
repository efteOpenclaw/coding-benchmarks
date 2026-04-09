# Build Prompt

Follow the chunked plan below. Complete each chunk fully before starting the next.

## CRITICAL RULES (always active)

1. Zero `any` types
2. Zero console statements — use `throw` for startup errors
3. Always `.safeParse()` — never `.parse()`
4. Always use response helpers — never manual `Response.json`
5. Always whitelist column names for dynamic SQL
6. Colocate tests with source files
7. Every test file imports from factories — never hardcode test data

## Workspace

Create your run folder at `/home/kimi-chunked-p1/runs/260401-kimi/`.
`cd` into it and create `BUILD_LOG.md` immediately. Log each chunk completion.

---

# Project 1: Task Manager — Chunked Build Plan

Build this project in 7 chunks. Complete each chunk fully (implementation + tests passing) before starting the next. Each chunk lists exactly what to create and what "done" means.

---

## Chunk 0: Project setup (do this first)

```bash
npm init -y
npm install next@14 react react-dom typescript better-sqlite3 iron-session bcryptjs zod
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom @types/node @types/better-sqlite3 @types/bcryptjs jsdom tailwindcss autoprefixer postcss
```

**Create these files:**
- `tsconfig.json` — strict mode, paths: `@/*` → `./src/*`, `@tests/*` → `./tests/*`
- `vitest.config.ts` — jsdom environment, react plugin, path aliases, setup file
- `next.config.js` — `reactStrictMode: true`
- `tailwind.config.ts` — content paths for `src/`
- `postcss.config.js` — tailwindcss + autoprefixer
- `src/app/globals.css` — `@tailwind base; @tailwind components; @tailwind utilities;`
- `tests/helpers/setup.ts` — jest-dom import, cleanup, vi.restoreAllMocks
- `tests/helpers/factories.ts` — `buildUser`, `createUserInDb`, `buildTask`, `createTaskInDb` (read `~/skills/test-factories.md` first)
- `tests/helpers/auth.ts` — `createAuthCookie()` using `sealData` (read `~/skills/test-factories.md` first)

**Add scripts to package.json:**
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

**Done when:** `npx tsc --noEmit` runs without error (may have no source files yet — that's fine).

**Read before starting:** `~/skills/test-factories.md`, `~/skills/dx-setup.md`

---

## Chunk 1: Foundation (validators + response helpers)

**Create these files:**
- `src/lib/validators.ts` — Zod schemas for register, login, createTask, updateTask, taskQuery
- `src/lib/validators.test.ts` — Tests for all schemas (valid, invalid, boundary values, defaults)
- `src/lib/api-response.ts` — `successResponse()` and `errorResponse()` helpers
- `src/lib/api-response.test.ts` — Tests for both helpers (status codes, response shape)

**Done when:**
- `npx vitest run src/lib/validators.test.ts` — all pass
- `npx vitest run src/lib/api-response.test.ts` — all pass
- `npx tsc --noEmit` — zero errors

**Read before starting:** `~/skills/zod-validation.md`, `~/skills/response-shaping.md`, `~/templates/validator.ts`, `~/templates/api-response.ts`

---

## Chunk 2: Database layer

**Create these files:**
- `src/lib/db.ts` — SQLite connection, schema, all user + task query functions

- `src/lib/db.test.ts` — Tests for every db function (CRUD, filters, sort, ownership, constraints)

**Done when:**
- `npx vitest run src/lib/db.test.ts` — all pass
- Tests use `getDb(':memory:')` for isolation
- Tests import from `@tests/helpers/factories` (no hardcoded test data)
- `npx tsc --noEmit` — zero errors

**Read before starting:** `~/skills/sql-safety.md`, `~/skills/authorization.md`, `~/templates/db-query.ts`

---

## Chunk 3: Session + Auth routes

**Create these files:**
- `src/lib/session.ts` — iron-session config with `getSession()` and `getSessionFromRequest()`
- `src/app/api/auth/register/route.ts` + `route.test.ts`
- `src/app/api/auth/login/route.ts` + `route.test.ts`
- `src/app/api/auth/logout/route.ts` + `route.test.ts`
- `src/app/api/auth/me/route.ts` + `route.test.ts`
- `tests/helpers/auth.ts` — `createAuthCookie()` using `sealData`

**Done when:**
- All 4 route test files pass
- Register returns 201, login returns 200, logout clears session, me returns user
- Tests use `createUserInDb()` from factories and `createAuthCookie()` from helpers
- Response uses explicit field selection (not spread destructuring)
- Login returns same error message for wrong-email and wrong-password
- `npx tsc --noEmit` — zero errors

**Read before starting:** `~/skills/session-auth.md`, `~/skills/api-route-pattern.md`, `~/skills/test-api-routes.md`, `~/templates/session.ts`, `~/templates/api-route.ts`

---

## Chunk 4: Task routes

**Create these files:**
- `src/app/api/tasks/route.ts` + `route.test.ts` (GET list + POST create)
- `src/app/api/tasks/[id]/route.ts` + `route.test.ts` (GET + PATCH + DELETE)

**Done when:**
- Both route test files pass
- GET filters by status, priority; sorts by due_date, created_at, priority
- POST returns 201 with defaults (status=todo, priority=medium)
- PATCH uses column whitelist for dynamic update
- DELETE returns 200
- All routes return 401 without auth, 404 for wrong user's task
- Tests use `createUserInDb()`, `createTaskInDb()`, `createAuthCookie()`
- `npx tsc --noEmit` — zero errors

**Read before starting:** `~/skills/api-route-pattern.md`, `~/skills/authorization.md`, `~/skills/test-api-routes.md`, `~/skills/test-error-paths.md`

---

## Chunk 5: Components

**Create these files:**
- `src/components/AuthForm.tsx` + `AuthForm.test.tsx`
- `src/components/TaskForm.tsx` + `TaskForm.test.tsx`
- `src/components/TaskItem.tsx` + `TaskItem.test.tsx`
- `src/components/TaskList.tsx` + `TaskList.test.tsx`
- `src/components/FilterBar.tsx` + `FilterBar.test.tsx`
- `src/components/ConfirmDialog.tsx` + `ConfirmDialog.test.tsx` (delete confirmation)

**Done when:**
- All 6 component test files pass
- Components use typed Props interfaces (no `any`)
- Named exports only
- `'use client'` directive on interactive components
- `htmlFor` + `id` on every label/input pair
- TaskItem shows priority colors, overdue highlighting, strikethrough for done
- `npx tsc --noEmit` — zero errors

**Read before starting:** `~/skills/component-patterns.md`, `~/skills/test-components.md`, `~/templates/component.tsx`, `~/templates/component.test.tsx`

---

## Chunk 6: Pages + Layout

**Create these files:**
- `src/app/layout.tsx` — root layout with Tailwind (imports globals.css)
- `src/app/page.tsx` — redirect (logged in → /tasks, not → /login)
- `src/app/login/page.tsx` — login page with AuthForm
- `src/app/register/page.tsx` — register page with AuthForm
- `src/app/tasks/page.tsx` — server component with auth guard
- `src/app/tasks/TasksClient.tsx` — client component (state, fetch, CRUD)
- `src/app/error.tsx` — root error boundary
- `src/app/tasks/error.tsx` — tasks section error boundary

**Done when:**
- `npx next build` — succeeds
- `npx vitest run` — all previous tests still pass (no regressions)
- Server components handle auth redirect
- TasksClient manages task state (create, edit, delete, filter, sort)
- Error boundaries render recovery UI with retry button
- `npx tsc --noEmit` — zero errors

**Read before starting:** `~/skills/component-patterns.md`, `~/skills/error-boundaries.md`

---

## Chunk 7: DX + Final validation

**Create these files:**
- `src/lib/env.ts` — Zod env validation with throw (if not created yet)
- `.env.example` — all variables documented
- `.gitignore` — .env*, *.db, node_modules, .next
- `README.md` — setup instructions, scripts table, architecture overview
- `REVIEW.md` — confidence scores, known weaknesses, what you'd improve

**Run full validation:**
```bash
npx vitest run --reporter=verbose
npx tsc --noEmit
npx next build
bash ~/lint/check.sh .

# Unused dep audit — remove anything that shows up
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -rq "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx"; then
    echo "UNUSED: ${dep} — run: npm uninstall ${dep}"
  fi
done
```

**Done when:**
- ALL tests pass
- Build succeeds
- Lint passes
- Unused dep audit returns zero (after uninstalling any found)
- README lets a new developer run the project in under 5 minutes
- REVIEW.md has honest self-assessment

**Read before starting:** `~/skills/dx-setup.md`, `~/skills/env-config.md`, `~/skills/pre-flight-security.md`, `~/skills/anti-patterns-code.md`, `~/skills/anti-patterns-deps.md`

---

## Summary

| Chunk | What | Files | Tests | Key skills |
|---|---|---|---|---|
| 0. Setup | npm install, config, test helpers, factories | 9 | 0 | test-factories, dx-setup |
| 1. Foundation | validators, api-response | 4 | ~40 | zod-validation, response-shaping |
| 2. Database | db layer + tests | 2 | ~30 | sql-safety, authorization |
| 3. Auth | session + 4 auth routes + tests | 10 | ~25 | session-auth, api-route-pattern |
| 4. Tasks | 2 task route files + tests | 4 | ~25 | authorization, test-error-paths |
| 5. Components | 6 components + tests | 12 | ~30 | component-patterns, test-components |
| 6. Pages | layout, pages, error boundaries | 8 | 0 (build test) | error-boundaries |
| 7. DX + Review | env, README, .env.example, final validation | 5 | 0 (full suite) | anti-patterns, pre-flight |

Total: ~150 tests across 8 chunks, each independently verifiable.

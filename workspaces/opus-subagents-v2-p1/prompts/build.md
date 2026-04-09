# Build — Task Manager

This is production code. A team will inherit what you build — they'll add features, fix bugs, and refactor against your test suite. Your tests are their safety net. A test that doesn't catch real bugs when someone changes code next month is worthless regardless of whether it passes today. Build what you'd be confident handing off.

## HOW TO BUILD — Use subagent-driven-development

Use the `superpowers:subagent-driven-development` skill. Write a plan first (use `superpowers:writing-plans`), then dispatch a fresh subagent per task. Each subagent gets fresh context with only what it needs — not your full conversation history. This prevents context degradation across tasks.

**Integration contracts — define these in the plan before dispatching any subagent:**

For every module that another module depends on, the plan must specify:
- What it exports (exact function/type names)
- Who imports it (which files call it)

List these explicitly in the plan as "Integration Points". Each subagent building a module that will be consumed by another must export those functions. Each subagent building a consumer must import and call them.

Add a final **Integration Verification** task after all modules are built. This task must write **seam tests** — not just grep for imports. A seam test imports the real consumer, mocks the provider at the boundary, exercises the code path, and asserts the mock was called with correct arguments. Grep-for-imports is insufficient because a module can import a function and never call it.

Read `~/projects/project-1.md` for the full spec.

## PATH — READ THIS FIRST

All files go in the current working directory. Run `pwd` to confirm you are in the right place.
If you are NOT in `__RUN_DIR__`, run:
```bash
cd __RUN_DIR__
```
Create `BUILD_LOG.md` immediately in the current directory.

## CRITICAL RULES (always active)

1. Zero `any` types — including `as any` casts
2. Zero console statements — use `throw` for startup errors
3. Always `.safeParse()` — never `.parse()`
4. Always use response helpers — never manual `Response.json`
5. Always whitelist column names for dynamic SQL
6. Colocate tests with source files
7. Every test file imports from factories — never hardcode test data

## Setup

```bash
npm init -y
npm install next@14 react react-dom typescript better-sqlite3 iron-session bcryptjs zod
npm install -D @tailwindcss/postcss vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom @types/node @types/better-sqlite3 @types/bcryptjs jsdom tailwindcss autoprefixer postcss
```

Create config files:
- `tsconfig.json` — strict mode, paths `@/*` → `./src/*` and `@tests/*` → `./tests/*`
- `vitest.config.ts` — environment jsdom, setupFiles `./tests/helpers/setup.ts`, globals true
- `next.config.js` — `{ reactStrictMode: true }`

**Tailwind CSS v4 config (use EXACTLY these — do NOT create tailwind.config.ts):**

`postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
```

`src/app/globals.css`:
```css
@import 'tailwindcss';
```

Create test helpers:
- `tests/helpers/setup.ts` — jest-dom, cleanup
- `tests/helpers/factories.ts` — `buildUser`, `createUserInDb`, `buildTask`, `createTaskInDb`
- `tests/helpers/auth.ts` — `createAuthCookie()` using sealData

Read `~/skills/meta-tests.md`. Copy the compliance test template into `tests/meta/compliance.test.ts` **verbatim**.

Add scripts to package.json: dev, build, start, test, typecheck.

## Skills & Templates

Read the relevant skills and templates from `~/skills/` and `~/templates/` as you build each layer:

| Layer | Skills | Templates |
|---|---|---|
| Validators | `zod-validation.md`, `response-shaping.md` | `validator.ts`, `api-response.ts` |
| Database | `sql-safety.md`, `authorization.md` | `db-query.ts` |
| Auth routes | `session-auth.md`, `api-route-pattern.md` | `session.ts`, `api-route.ts` |
| Task routes | `api-route-pattern.md`, `authorization.md` | `api-route.ts` |
| Components | `component-patterns.md`, `test-components.md` | `component.tsx`, `component.test.tsx` |
| Pages | `error-boundaries.md` | — |
| DX | `dx-setup.md`, `env-config.md`, `pre-flight-security.md`, `anti-patterns-code.md`, `anti-patterns-deps.md` | — |
| Tests | `test-api-routes.md`, `test-error-paths.md`, `test-factories.md` | `api-route.test.ts` |

## What to build

**Lib layer:**
- `src/lib/validators.ts` + test — all Zod schemas with boundary values
- `src/lib/api-response.ts` + test — successResponse, errorResponse helpers
- `src/lib/db.ts` + test — SQLite singleton, WAL, FKs, all CRUD, UPDATABLE_COLUMNS whitelist, SORT_MAP
- `src/lib/session.ts` — iron-session config

**Auth routes (4):**
- register (201, 400, 409, no password_hash, sets cookie)
- login (200, 401 wrong email, 401 wrong password — SAME error message)
- logout (200)
- me (200 with user, 401)

**Task routes (2 files):**
- GET list (filters, sort, auth), POST create (defaults, validation)
- GET/PATCH/DELETE by id (auth, ownership, 404 for wrong user)

**Components (6) — all with tests:**
- AuthForm, TaskForm, TaskItem, TaskList, FilterBar, ConfirmDialog

**Pages:**
- layout.tsx, page.tsx (redirect), login, register
- tasks/page.tsx (server), tasks/TasksClient.tsx (client CRUD + filter + sort)
- error.tsx, tasks/error.tsx

**DX:**
- .env.example, .gitignore, README.md, REVIEW.md

## Final validation — ALL THREE must pass:

```bash
npx vitest run --reporter=verbose
npx tsc --noEmit
npx next build
```

**`npx next build` MUST succeed. If it fails, fix the issue before proceeding.**

```bash
# Dep audit
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -rq "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx"; then
    echo "UNUSED: ${dep}" && npm uninstall ${dep}
  fi
done
```

**Log final summary in BUILD_LOG.md.**

## Expected coverage

- ~150 tests total
- Every route.ts has a colocated route.test.ts
- Every component has a colocated .test.tsx
- Meta-tests pass (zero any, zero console, safeParse, response helpers, factory imports)

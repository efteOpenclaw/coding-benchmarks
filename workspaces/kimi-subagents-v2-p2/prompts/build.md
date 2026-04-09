# Build — Collaborative Notes Wiki (P2)

This is production code. A team will inherit what you build — they'll add features, fix bugs, and refactor against your test suite. Your tests are their safety net. A test that doesn't catch real bugs when someone changes code next month is worthless regardless of whether it passes today. Build what you'd be confident handing off.

## HOW TO BUILD — Use subagent-driven-development

Use the `superpowers:subagent-driven-development` skill. Write a plan first (use `superpowers:writing-plans`), then dispatch a fresh subagent per task. Each subagent gets fresh context with only what it needs — not your full conversation history. This prevents context degradation across tasks.

**Integration contracts — define these in the plan before dispatching any subagent:**

For every module that another module depends on, the plan must specify:
- What it exports (exact function/type names)
- Who imports it (which files call it)

List these explicitly in the plan as "Integration Points". Each subagent building a module that will be consumed by another must export those functions. Each subagent building a consumer must import and call them.

**Known integration points for this project:**
- `server.ts` exports `broadcastPageUpdate(slug)`, `broadcastLockAcquired(slug, userId)`, `broadcastLockReleased(slug)` — imported and called by `pages/[slug]/revisions/route.ts` (on create) and `pages/[slug]/lock/route.ts` (on acquire/release)
- `src/lib/db.ts` exports `setPool(p: Pool)` — imported in `tests/helpers/setup.ts`
- `src/lib/markdown.ts` exports `renderMarkdown(md)` — imported in revision create route to store `content_html`

**Final Integration Verification task (REQUIRED):**

After all modules are built, add a final task that writes **seam tests** — not just greps for imports. For every integration point:
1. Import the real consumer (e.g., the route handler)
2. Mock the provider at the boundary (e.g., `vi.mock('../../../server')`)
3. Exercise the consumer's code path (e.g., POST a new revision)
4. Assert the mock was called with correct arguments (e.g., `expect(broadcastPageUpdate).toHaveBeenCalledWith('test-page')`)

Grep-for-imports is insufficient — a module can import a function and never call it on any code path. Only behavioral seam tests catch this.

Read `~/projects/project-2.md` for the full spec.

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
8. **PostgreSQL via `pg` (node-postgres)** — NOT SQLite, NOT better-sqlite3
9. All DB functions are **async** (Pool.query returns Promises)
10. Store both `content_markdown` AND `content_html` in revisions
11. **Use `pg-mem` for tests** — no real PostgreSQL server needed. Read `~/skills/test-pg-mem.md`.
12. db.ts MUST export `setPool(p: Pool)` so tests can inject pg-mem's pool
13. **NEVER call `closePool()` or `initDb()` in individual test files.** Only `tests/helpers/setup.ts` manages the pool lifecycle. Route tests import the handler and call it — the pg-mem pool is already injected. If a route test calls `closePool()`, it destroys the pg-mem pool and the next test tries to connect to a real PostgreSQL server, which fails.

## Setup

```bash
npm init -y
npm install next@14 react react-dom typescript pg iron-session bcryptjs zod marked diff ws
npm install -D @tailwindcss/postcss vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom @types/node @types/pg @types/bcryptjs @types/ws jsdom tailwindcss autoprefixer postcss pg-mem
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

Create test helpers (read `~/skills/test-pg-mem.md` and `~/skills/test-factories-pg.md`):
- `tests/helpers/setup.ts` — pg-mem database, `setPool()` injection, `initDb()`, TRUNCATE between tests
- `tests/helpers/factories.ts` — `buildUser`, `createUserInDb`, `buildPage`, `createPageInDb`, `createRevisionInDb` (all async)
- `tests/helpers/auth.ts` — `createAuthCookie()` using sealData

Read `~/skills/env-config-pg.md`, create `src/lib/env.ts` and `.env.example`.

Read `~/skills/meta-tests.md`. Copy the compliance test template into `tests/meta/compliance.test.ts` **verbatim**.

Add scripts to package.json: dev, build, start, test, typecheck.

## Skills & Templates

| Layer | Skills | Templates |
|---|---|---|
| Validators | `zod-validation.md`, `response-shaping.md` | `validator.ts`, `api-response.ts` |
| Database | `postgresql-patterns.md`, `sql-safety.md`, `revision-history.md`, `tree-hierarchy.md` | `db-query-pg.ts` |
| Auth routes | `session-auth.md`, `api-route-pattern.md` | `session.ts`, `api-route.ts` |
| Page/revision/lock routes | `api-route-pattern.md`, `authorization.md`, `page-locking.md`, `revision-history.md` | `api-route.ts` |
| Search | `tree-hierarchy.md` | — |
| Components | `component-patterns.md`, `test-components.md`, `markdown-rendering.md` | `component.tsx`, `component.test.tsx` |
| WebSocket | `websocket-patterns.md` | — |
| Pages | `error-boundaries.md` | — |
| DX | `env-config-pg.md`, `pre-flight-security.md`, `anti-patterns-code.md`, `anti-patterns-deps.md` | — |
| Tests | `test-api-routes.md`, `test-error-paths.md`, `test-factories-pg.md`, `test-pg-mem.md` | `api-route.test.ts` |

Do NOT read `~/templates/db-query.ts`, `~/skills/env-config.md`, or `~/skills/test-factories.md` — those are for SQLite projects.

## What to build

**Lib layer:**
- `src/lib/validators.ts` + test — schemas for auth, pages, revisions, search, locks
- `src/lib/api-response.ts` + test — successResponse, errorResponse helpers
- `src/lib/db.ts` + test — PostgreSQL Pool with `setPool()`, `initDb()`, all CRUD, PAGE_UPDATABLE whitelist, transactions for createPage
- `src/lib/session.ts` — iron-session config
- `src/lib/markdown.ts` + test — `renderMarkdown()`, `extractToc()`
- `src/lib/diff.ts` + test — `diffRevisions()`

**Auth routes (4):**
- register (201, 400, 409, no password_hash, sets cookie)
- login (200, 401 wrong email, 401 wrong password — SAME error message)
- logout (200)
- me (200 with user, 401)

**Page + revision + lock routes (6 files):**
- pages list + create (auto-slug, initial revision)
- pages/:slug (GET with revision + breadcrumbs, PATCH, DELETE)
- revisions list + create (render markdown→HTML at write time, **call broadcastPageUpdate**)
- revisions/:revId (GET specific)
- revisions/:revId/restore (POST as new revision)
- lock (GET status, POST acquire 409 if locked **call broadcastLockAcquired**, DELETE release owner only **call broadcastLockReleased**)

**Search route:**
- GET `?q=term` with ILIKE (pg-mem doesn't support to_tsvector)

**Components (9) — all with tests:**
- AuthForm, PageTree, PageContent, PageEditor, LockBanner, RevisionHistory, CreatePageModal, SearchBox, Breadcrumb

**Pages:**
- layout.tsx, page.tsx (redirect), login, register
- (app)/layout.tsx with sidebar, (app)/[slug]/page.tsx, (app)/[slug]/PageClient.tsx
- error.tsx

**WebSocket:**
- server.ts — custom server wrapping Next.js with ws

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
  if ! grep -rq "from ['\"]${dep}" src/ server.ts --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "UNUSED: ${dep}" && npm uninstall ${dep}
  fi
done
```

**Log final summary in BUILD_LOG.md.**

## Expected coverage

- ~160 tests total
- Every route.ts has a colocated route.test.ts
- Every component has a colocated .test.tsx
- Meta-tests pass

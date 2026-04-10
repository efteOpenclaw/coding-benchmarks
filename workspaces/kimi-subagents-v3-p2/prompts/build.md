# Build — Collaborative Notes Wiki (P2)

This is production code. A team will inherit what you build — they'll add features, fix bugs, and refactor against your test suite. Your tests are their safety net. A test that doesn't catch real bugs when someone changes code next month is worthless regardless of whether it passes today. Build what you'd be confident handing off.

## HOW TO BUILD — Use subagent-driven-development

Use the `superpowers:subagent-driven-development` skill. Write a plan first (use `superpowers:writing-plans`), then dispatch a fresh subagent per task. Each subagent gets fresh context with only what it needs — not your full conversation history. This prevents context degradation across tasks.

**Before dispatching any subagent, write a feature participant map in the plan.**

For every feature that spans more than one file, list ALL files that must exist and be wired for the feature to work. A feature is only complete when every participant is present and connected — not when one end is built.

**WebSocket real-time feature — ALL of these must exist:**
- `src/lib/events.ts` — decoupled broadcast interface (emitter between routes and WebSocket server)
- `server.ts` — WebSocket server that registers listeners on events.ts and broadcasts to clients
- `src/app/api/pages/[slug]/revisions/route.ts` — calls `broadcastPageUpdate(slug)` via events.ts on revision create/restore
- `src/app/api/pages/[slug]/lock/route.ts` — calls `broadcastLockAcquired(slug, userId)` and `broadcastLockReleased(slug)` via events.ts on acquire/release
- `src/app/(app)/[slug]/PageClient.tsx` — **opens a WebSocket connection on mount**, listens for `page:updated`, `lock:acquired`, `lock:released`, `presence:join`, `presence:leave` events, and **updates UI state** (lock banner refresh, presence avatars, page content refresh)

The client (`PageClient.tsx`) is the most commonly missed participant. Without it, the WebSocket server broadcasts to nobody and real-time features are completely non-functional from the user's perspective. **Assign the PageClient WebSocket wiring to the same subagent that builds PageClient, not a separate phase.**

**All other integration points:**
- `src/lib/db.ts` exports `setPool(p: Pool)` — imported in `tests/helpers/setup.ts`
- `src/lib/markdown.ts` exports `renderMarkdown(md)` — imported in revision create route to store `content_html`

**Final Integration Verification task (REQUIRED):**

After all modules are built, add a final task that:

1. **Verifies participant completeness** — confirm every WebSocket participant exists:
   ```bash
   # All five must exist and be non-empty
   test -f src/lib/events.ts && echo "events.ts ✓"
   test -f server.ts && echo "server.ts ✓"
   grep -q "broadcastPageUpdate\|broadcastLockAcquired" src/app/api/pages/*/revisions/route.ts src/app/api/pages/*/lock/route.ts && echo "route callers ✓"
   grep -q "WebSocket\|useEffect" src/app/\(app\)/\[slug\]/PageClient.tsx && echo "PageClient consumer ✓"
   ```
   If any check fails, fix it before writing seam tests.

2. **Writes behavioral seam tests** — not just greps for imports. For every integration point:
   - Import the real consumer (e.g., the route handler)
   - Mock the provider at the boundary (e.g., `vi.mock('../../../lib/events')`)
   - Exercise the consumer's code path (e.g., POST a new revision)
   - Assert the mock was called with correct arguments (e.g., `expect(broadcastPageUpdate).toHaveBeenCalledWith('test-page')`)

   Grep-for-imports is insufficient — a module can import a function and never call it on any code path.

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
13. **NEVER call `closePool()` or `initDb()` in individual test files.** Only `tests/helpers/setup.ts` manages the pool lifecycle.
14. **DELETE /api/pages/:slug MUST cascade-delete all child pages.** Use `ON DELETE CASCADE` on the `parent_id` foreign key in the schema, so children are automatically removed when a parent is deleted.

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
- `src/lib/events.ts` — broadcast event emitter (decouples routes from WebSocket server)

**Auth routes (4):**
- register (201, 400, 409, no password_hash, sets cookie)
- login (200, 401 wrong email, 401 wrong password — SAME error message)
- logout (200)
- me (200 with user, 401)

**Page + revision + lock routes (6 files):**
- pages list + create (auto-slug, initial revision)
- pages/:slug (GET with revision + breadcrumbs, PATCH, DELETE — **cascade deletes children via FK**)
- revisions list + create (render markdown→HTML at write time, **call broadcastPageUpdate**)
- revisions/:revId (GET specific)
- revisions/:revId/restore (POST as new revision, **call broadcastPageUpdate**)
- lock (GET status, POST acquire 409 if locked **call broadcastLockAcquired**, DELETE release owner only **call broadcastLockReleased**)

**Search route:**
- GET `?q=term` with ILIKE (pg-mem doesn't support to_tsvector)

**Components (9) — all with tests:**
- AuthForm, PageTree, PageContent, PageEditor, LockBanner, RevisionHistory, CreatePageModal, SearchBox, Breadcrumb

**Pages:**
- layout.tsx, page.tsx (redirect), login, register
- (app)/layout.tsx with sidebar, (app)/[slug]/page.tsx
- (app)/[slug]/PageClient.tsx — **MUST include**:
  - `useEffect` that opens a `WebSocket` connection to the server on mount
  - Event handlers for `page:updated` (refresh revision), `lock:acquired` / `lock:released` (refresh lock state), `presence:join` / `presence:leave` (update presence list)
  - Presence avatar display (who else is viewing this page)
  - Cleanup: `ws.close()` on unmount
- error.tsx

**WebSocket:**
- server.ts — custom server wrapping Next.js with ws, registers listeners on events.ts

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
- Seam tests verify both server-side calls AND that PageClient opens WebSocket
- Meta-tests pass

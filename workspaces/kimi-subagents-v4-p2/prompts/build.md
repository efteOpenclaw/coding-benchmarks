# Build — Collaborative Notes Wiki (P2)

This is production code. A team will inherit what you build — they'll add features, fix bugs, and refactor against your test suite. Your tests are their safety net. A test that doesn't catch real bugs when someone changes code next month is worthless regardless of whether it passes today. Build what you'd be confident handing off.

## HOW TO BUILD — Use subagent-driven-development

Use the `superpowers:subagent-driven-development` skill. Write a plan first (use `superpowers:writing-plans`), then dispatch a fresh subagent per task.

### When writing the plan, for every task:

1. **Extract all spec requirements that apply to it** — not just what to build, but every constraint, edge case, and field behavior from `~/projects/project-2.md`. If a requirement is in the spec, it must appear in the task.

2. **List named acceptance tests** — write the test names before the code. Every spec requirement becomes a named test. If a test isn't named in the plan, it won't get written.

3. **Include the relevant spec section verbatim** in the task brief — summaries lose edge cases. Pass the original spec text to the subagent.

### When dispatching each subagent, the task brief must contain:
- Files to create
- Named tests (from the requirement extraction above)
- Integration points (which files this task depends on / is depended upon by)
- Relevant spec section (verbatim from project-2.md)

---

## Requirement Matrix — extract these into the right task briefs

These are requirements that have been missed in previous runs. Every one must appear in a task brief and have a named test.

### Page hierarchy
| Requirement | Named test |
|---|---|
| POST /api/pages: validate depth — return 400 if parent is already at depth 4 (child would be depth 5, which is the max) | `"POST /api/pages returns 400 when parent is at depth 5"` |
| GET /api/pages/:slug: response includes full breadcrumb trail (all ancestors from root) | `"GET /api/pages/:slug includes breadcrumb trail"` |
| DELETE /api/pages/:slug: cascade deletes all child pages (ON DELETE CASCADE FK) | `"DELETE /api/pages/:slug removes child pages"` |
| GET /api/pages: returns flat list with parent_id for all pages | `"GET /api/pages includes parent_id"` |

### Revisions
| Requirement | Named test |
|---|---|
| POST .../revisions/:revId/restore: creates a NEW revision, does not overwrite existing | `"restore creates a new revision entry, not an update"` |
| GET /api/pages/:slug: latest revision = current content (highest created_at) | `"GET /api/pages/:slug returns latest revision content"` |
| content_html is rendered from content_markdown at write time (stored, not computed on read) | `"POST revision stores rendered HTML"` |

### Locks
| Requirement | Named test |
|---|---|
| POST /api/pages/:slug/lock: returns 409 if locked by a DIFFERENT user | `"POST lock returns 409 when locked by another user"` |
| POST /api/pages/:slug/lock: if locked by SAME user, extend expiry (auto-renewable) | `"POST lock extends expiry when already owned by requester"` |
| DELETE /api/pages/:slug/lock: returns 403 if requester is not the lock owner | `"DELETE lock returns 403 when requester is not owner"` |
| expires_at = locked_at + 5 minutes | `"acquired lock expires in 5 minutes"` |

### Auth
| Requirement | Named test |
|---|---|
| POST /api/auth/login: SAME error message for wrong email and wrong password (no account enumeration) | `"login returns identical error for wrong email and wrong password"` |
| POST /api/auth/register: response MUST NOT include password_hash | `"register response does not include password_hash"` |

### WebSocket / Real-time
| Requirement | Named test |
|---|---|
| Connection URL: ws://localhost:3000/api/ws?token={session_token} | — |
| Server→Client: `page:updated { slug, revision_id, edited_by }` on revision create/restore | `"POST revision broadcasts page:updated with revision_id and edited_by"` |
| Server→Client: `lock:acquired { slug, locked_by }` on lock acquire | `"POST lock broadcasts lock:acquired with locked_by"` |
| Server→Client: `lock:released { slug }` on lock release | `"DELETE lock broadcasts lock:released"` |
| Server→Client: `presence:update { users: [{ id, display_name, current_page }] }` when user joins/leaves page | — |
| Client→Server: `presence:page { slug }` sent by PageClient on mount | — |
| Client→Server: `presence:leave {}` sent by PageClient on unmount | — |

---

## WebSocket feature — ALL participants must exist (v3 carry-over)

- `src/lib/events.ts` — decoupled broadcast interface
- `server.ts` — WebSocket server, registers on events.ts, broadcasts to clients
- `src/app/api/pages/[slug]/revisions/route.ts` — calls broadcastPageUpdate on create/restore
- `src/app/api/pages/[slug]/lock/route.ts` — calls broadcastLockAcquired/Released
- `src/app/(app)/[slug]/PageClient.tsx` — opens WebSocket on mount, handles all 4 server events, sends presence:page on mount, presence:leave on unmount, shows presence avatars with current_page

**Assign PageClient WebSocket wiring to the same subagent that builds PageClient.**

---

## Final Integration Verification task (REQUIRED — 3 steps)

**Step 1: Participant completeness**
```bash
test -f src/lib/events.ts && echo "events.ts ✓" || echo "MISSING events.ts"
test -f server.ts && echo "server.ts ✓" || echo "MISSING server.ts"
grep -q "broadcast" src/app/api/pages/*/revisions/route.ts src/app/api/pages/*/lock/route.ts && echo "route callers ✓" || echo "MISSING route broadcast calls"
grep -q "WebSocket\|useEffect" "src/app/(app)/[slug]/PageClient.tsx" && echo "PageClient consumer ✓" || echo "MISSING PageClient WebSocket"
```
Fix any failure before proceeding.

**Step 2: Spec coverage check**
Go through every row in the Requirement Matrix above. For each named test, verify it exists in the test suite (`grep -r "test name" tests/`). For any missing test, write it now.

**Step 3: Behavioral seam tests**
For every broadcast integration point, write a test that:
1. Imports the real route handler
2. Mocks the broadcast at the boundary (`vi.mock('../../../lib/events')`)
3. Exercises the code path
4. Asserts the mock was called with correct arguments including all fields (`slug`, `revision_id`, `edited_by`, `locked_by` as applicable)

---

## PATH — READ THIS FIRST

All files go in the current working directory. Run `pwd` to confirm you are in `__RUN_DIR__`.
If not: `cd __RUN_DIR__`

Create `BUILD_LOG.md` immediately.

## CRITICAL RULES (always active)

1. Zero `any` types — including `as any` casts
2. Zero console statements — use `throw` for startup errors
3. Always `.safeParse()` — never `.parse()`
4. Always use response helpers — never manual `Response.json`
5. Always whitelist column names for dynamic SQL
6. Colocate tests with source files
7. Every test file imports from factories — never hardcode test data
8. **PostgreSQL via `pg` (node-postgres)** — NOT SQLite
9. All DB functions are **async** (Pool.query returns Promises)
10. Store both `content_markdown` AND `content_html` in revisions
11. **Use `pg-mem` for tests** — read `~/skills/test-pg-mem.md`
12. db.ts MUST export `setPool(p: Pool)`
13. **NEVER call `closePool()` or `initDb()` in individual test files**
14. **DELETE /api/pages/:slug MUST cascade-delete all child pages** — `ON DELETE CASCADE` on parent_id FK

## Setup

```bash
npm init -y
npm install next@14 react react-dom typescript pg iron-session bcryptjs zod marked diff ws
npm install -D @tailwindcss/postcss vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom @types/node @types/pg @types/bcryptjs @types/ws jsdom tailwindcss autoprefixer postcss pg-mem
```

Config files:
- `tsconfig.json` — strict mode, paths `@/*` → `./src/*`, `@tests/*` → `./tests/*`
- `vitest.config.ts` — environment jsdom, setupFiles `./tests/helpers/setup.ts`, globals true
- `next.config.js` — `{ reactStrictMode: true }`

**Tailwind CSS v4 (use EXACTLY these):**

`postcss.config.js`:
```javascript
module.exports = { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } };
```
`src/app/globals.css`:
```css
@import 'tailwindcss';
```

Test helpers:
- `tests/helpers/setup.ts` — pg-mem pool lifecycle, `setPool()`, `initDb()`, TRUNCATE between tests
- `tests/helpers/factories.ts` — `buildUser`, `createUserInDb`, `buildPage`, `createPageInDb`, `createRevisionInDb`
- `tests/helpers/auth.ts` — `createAuthCookie()`

Read `~/skills/meta-tests.md`. Copy compliance test template into `tests/meta/compliance.test.ts` **verbatim**.

## Skills & Templates

| Layer | Skills | Templates |
|---|---|---|
| Validators | `zod-validation.md`, `response-shaping.md` | `validator.ts`, `api-response.ts` |
| Database | `postgresql-patterns.md`, `sql-safety.md`, `revision-history.md`, `tree-hierarchy.md` | `db-query-pg.ts` |
| Auth routes | `session-auth.md`, `api-route-pattern.md` | `session.ts`, `api-route.ts` |
| Page/revision/lock routes | `api-route-pattern.md`, `authorization.md`, `page-locking.md`, `revision-history.md` | `api-route.ts` |
| Components | `component-patterns.md`, `test-components.md`, `markdown-rendering.md` | `component.tsx`, `component.test.tsx` |
| WebSocket | `websocket-patterns.md` | — |
| Tests | `test-api-routes.md`, `test-error-paths.md`, `test-factories-pg.md`, `test-pg-mem.md` | `api-route.test.ts` |

Do NOT read SQLite skills/templates.

## What to build

**Lib layer:** validators, api-response, db (with setPool + initDb + all CRUD), session, markdown (renderMarkdown + extractToc), diff (diffRevisions), events (broadcast emitter)

**Auth routes (4):** register, login, logout, me

**Page routes:** list, create (auto-slug + initial revision + depth check), get (with latest revision + breadcrumbs), patch, delete (cascade)

**Revision routes:** list, create (render markdown→HTML + broadcast), get specific, restore (new revision + broadcast)

**Lock routes:** check, acquire (409 if other user, extend if own + broadcast), release (403 if not owner + broadcast)

**Search route:** ILIKE across title + content

**Components (9 with tests):** AuthForm, PageTree, PageContent, PageEditor, LockBanner, RevisionHistory, CreatePageModal, SearchBox, Breadcrumb

**Pages:** layout, root redirect, login, register, (app)/layout with sidebar, (app)/[slug]/page.tsx, (app)/[slug]/PageClient.tsx (full WebSocket wiring — see participant map above), error.tsx

**WebSocket:** server.ts — custom Next.js server with ws, presence tracking, event broadcasting

**DX:** .env.example, .gitignore, README.md, REVIEW.md

## Final validation

```bash
npx vitest run --reporter=verbose
npx tsc --noEmit
npx next build
```

All three must pass. Fix failures before proceeding.

```bash
# Dep audit
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies||{}).join('\n'))"); do
  if ! grep -rq "from ['\"]${dep}" src/ server.ts --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "UNUSED: ${dep}" && npm uninstall ${dep}
  fi
done
```

Log final summary in BUILD_LOG.md.

## Expected coverage

- ~180 tests total
- Every requirement in the Requirement Matrix has a named test
- Every route has a colocated test file
- Every component has a colocated test file
- Seam tests verify broadcast calls with full argument assertions
- Meta-tests pass

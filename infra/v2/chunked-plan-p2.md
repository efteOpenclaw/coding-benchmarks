# Chunked Build — Collaborative Notes Wiki (P2)

You build this project in 8 chunks. Complete each chunk (tests green) before starting the next.

Your run folder is `__RUN_PATH__`. Create `BUILD_LOG.md` immediately.

## CRITICAL RULES (always active)

1. Zero `any` types
2. Zero console statements — use `throw` for startup errors
3. Always `.safeParse()` — never `.parse()`
4. Always use response helpers — never manual `Response.json`
5. Always whitelist column names for dynamic SQL
6. Colocate tests with source files
7. Every test file imports from factories — never hardcode test data
8. **PostgreSQL via `pg` (node-postgres)** — NOT SQLite, NOT better-sqlite3
9. All DB functions are **async** (Pool.query returns Promises)
10. Store both `content_markdown` AND `content_html` in revisions

---

## Chunk 0: Project Setup

```bash
npm init -y
npm install next@14 react react-dom typescript pg iron-session bcryptjs zod marked diff ws
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom @types/node @types/pg @types/bcryptjs @types/ws jsdom tailwindcss autoprefixer postcss
```

Create: `tsconfig.json` (strict, paths), `vitest.config.ts`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`.

Read `~/skills/test-factories-pg.md`, then create:
- `tests/helpers/setup.ts` — initDb, TRUNCATE CASCADE between tests, closePool
- `tests/helpers/factories.ts` — `buildUser`, `createUserInDb`, `buildPage`, `createPageInDb`, `createRevisionInDb`
- `tests/helpers/auth.ts` — `createAuthCookie()` using sealData

Read `~/skills/env-config-pg.md`, create `src/lib/env.ts` and `.env.example`.

Add scripts to package.json: dev, build, start, test, typecheck.

---

## Chunk 1: Validators + Response Helpers

Read `~/skills/zod-validation.md`, `~/skills/response-shaping.md`. Write:
- `src/lib/validators.ts` — schemas for: registerSchema (email max 255, password min 8 max 128, display_name max 100), loginSchema, createPageSchema (title max 200, content_markdown, parent_id optional), updatePageSchema, createRevisionSchema, searchQuerySchema, lockParamsSchema
- `src/lib/validators.test.ts` — all schemas: valid, invalid, boundary values (`it.each`)
- `src/lib/api-response.ts` + test

Run `npx vitest run src/lib/validators.test.ts src/lib/api-response.test.ts`. **All must pass.**

---

## Chunk 2: Database Layer + Markdown

Read `~/skills/postgresql-patterns.md`, `~/skills/sql-safety.md`, `~/skills/revision-history.md`, `~/skills/tree-hierarchy.md`. Read template `~/templates/db-query-pg.ts`.

Implement:
- `src/lib/db.ts` — PostgreSQL Pool, initDb(), all CRUD for users, pages, revisions, locks. `PAGE_UPDATABLE` whitelist. Parameterized `$1` queries. Transactions for createPage (page + initial revision).
- `src/lib/markdown.ts` — `renderMarkdown()` using marked, `extractToc()` for heading extraction
- `src/lib/diff.ts` — `diffRevisions()` using diff package
- `src/lib/db.test.ts` — user CRUD, page CRUD with slugs, revision ordering, lock acquire/release/expiry, tree depth validation

Tests must import from `@tests/helpers/factories`. Run — **all must pass.**

---

## Chunk 3: Session + Auth Routes

Read `~/skills/session-auth.md`, `~/skills/api-route-pattern.md`. Write:
- `src/lib/session.ts` — iron-session config
- `src/app/api/auth/register/route.ts` + test — 201, 400 each field, 409 duplicate, explicit field selection (no password_hash), sets cookie
- `src/app/api/auth/login/route.ts` + test — 200, 401 wrong email, 401 wrong password (SAME error message), sets cookie
- `src/app/api/auth/logout/route.ts` + test — 200, clears cookie
- `src/app/api/auth/me/route.ts` + test — 200 with user (explicit fields), 401

Tests use `createUserInDb()` and `createAuthCookie()`. Async bcrypt (`await hash()`, not hashSync). Run — **all must pass.**

---

## Chunk 4: Page + Revision + Lock Routes

Read `~/skills/api-route-pattern.md`, `~/skills/authorization.md`, `~/skills/page-locking.md`, `~/skills/revision-history.md`.

- `src/app/api/pages/route.ts` + test — GET list (all pages with parent_id), POST create (page + initial revision, auto-slug)
- `src/app/api/pages/[slug]/route.ts` + test — GET (page + current revision + breadcrumbs), PATCH (title, parent_id with depth check), DELETE
- `src/app/api/pages/[slug]/revisions/route.ts` + test — GET list (ordered by created_at DESC), POST new revision (render markdown→HTML at write time)
- `src/app/api/pages/[slug]/revisions/[revId]/route.ts` + test — GET specific revision
- `src/app/api/pages/[slug]/revisions/[revId]/restore/route.ts` + test — POST restore as NEW revision (not mutation)
- `src/app/api/pages/[slug]/lock/route.ts` + test — GET status, POST acquire (409 if locked), DELETE release (owner only)

Lock responses: `{ locked: boolean, locked_by?: {...}, expires_at?: string }`.
All auth-protected (401 without session). Run — **all must pass.** Also re-run auth tests.

---

## Chunk 5: Search

Read `~/skills/tree-hierarchy.md` (search section).

- `src/app/api/search/route.ts` + test — GET `?q=term` → full-text search using `to_tsvector` + `plainto_tsquery`. Return pages with rank. Fallback to ILIKE if tsvector not available.

Run — **all must pass.**

---

## Chunk 6: Components

Read `~/skills/component-patterns.md`, `~/skills/markdown-rendering.md`. Implement:
- `src/components/AuthForm.tsx` + test — login/register form, loading state, error display
- `src/components/PageTree.tsx` + test — collapsible sidebar tree, parent/child hierarchy
- `src/components/PageContent.tsx` + test — rendered markdown display with TOC sidebar
- `src/components/PageEditor.tsx` + test — split-pane: markdown left, live preview right
- `src/components/LockBanner.tsx` + test — "X is editing" banner when locked
- `src/components/RevisionHistory.tsx` + test — revision list + diff view
- `src/components/CreatePageModal.tsx` + test — title + optional parent dropdown
- `src/components/SearchBox.tsx` + test — search input
- `src/components/Breadcrumb.tsx` + test — hierarchy breadcrumbs

All: typed Props, named exports, `'use client'`, Tailwind only. Run — **all must pass.**

---

## Chunk 7: Pages + Layout + WebSocket + Final Validation

Read `~/skills/websocket-patterns.md`, `~/skills/error-boundaries.md`.

Pages:
- `src/app/layout.tsx`, `src/app/page.tsx` (redirect based on auth)
- `src/app/login/page.tsx`, `src/app/register/page.tsx`
- `src/app/(app)/layout.tsx` — sidebar with PageTree
- `src/app/(app)/[slug]/page.tsx` — page view (server component)
- `src/app/(app)/[slug]/PageClient.tsx` — client wrapper for editing, locks, presence
- `src/app/error.tsx`, error boundaries

WebSocket:
- `server.ts` — custom server wrapping Next.js with ws. Auth via session token. Server-authoritative events.

DX:
- `.gitignore`, `README.md`, `REVIEW.md`

Final validation:
```bash
npx vitest run --reporter=verbose
npx tsc --noEmit
npx next build
bash ~/lint/check.sh .

# Dep audit
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -rq "from ['\"]${dep}" src/ server.ts --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "UNUSED: ${dep}" && npm uninstall ${dep}
  fi
done
```

**Everything must pass. Log final summary in BUILD_LOG.md.**

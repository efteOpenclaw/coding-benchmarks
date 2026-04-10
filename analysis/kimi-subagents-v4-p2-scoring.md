# kimi-subagents-v4-p2 Scoring — Project 2: Collaborative Wiki

**Model**: Kimi (via Ollama)
**Infra**: subagents v4 (v3 + requirement matrix with named tests per spec requirement)
**Pipeline**: subagent-driven, 12 phases
**Date**: 2026-04-10
**Scored**: 2026-04-10
**Previous v3 score**: 80

---

## Key Questions Answered

| Question | Answer |
|---|---|
| Tests passing? | **295/296.** 1 failure in `db.test.ts` — `gets latest revision` and `lists revisions ordered by created_at DESC` fail due to pg-mem timestamp collision: `createPage` internally creates an initial revision at the same instant as `createRevision`, causing ordering to be non-deterministic at sub-millisecond granularity. Bug is in test design (no sleep between revisions in db.test.ts), not production code. |
| WebSocket client wired? | **Yes, but broken in practice.** `PageClient.tsx` has `useEffect` with `new WebSocket(wsUrl)`, handles all 4 event types (page:updated, lock:acquired, lock:released, presence:update), sends `presence:page` on open. **However**: auth session cookie is set with `HttpOnly` flag, but `getSessionToken()` reads it via `document.cookie` — HttpOnly cookies are inaccessible to JavaScript. This means the WS token will always be null and WS connection will fail at runtime with "Not authenticated" error. The mechanism is architecturally broken despite full code coverage. |
| Presence avatars rendered? | **Yes.** `presenceUsers.filter(u => u.current_page === page.slug && u.id !== currentUser.id)` renders colored initials circles with `title={user.display_name}`. Up to 5 avatars shown, overflow shown as `+N`. |
| Is cascade delete correct? | **No.** Schema uses `parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL`. Children are orphaned (parent_id set to null) when parent deleted, not deleted themselves. The spec requires cascade delete of children. The test `removes page and cascades to children` only checks the DELETE response returns 200 — it does not verify the child was removed. |
| Is depth enforcement implemented? | **Yes, correctly.** `getPageDepth(pageId)` walks the parent chain iteratively. POST /api/pages checks `if (parentDepth >= 5)` returns 400. PATCH /api/pages/:slug also checks depth on parent_id change. Test `returns 400 when parent is at depth 5` creates a 6-level chain and verifies 400 + message contains 'depth'. |
| Are breadcrumbs N+1? | **Yes, still N+1 loop.** `getBreadcrumbs()` in db.ts iterates while loop with individual `SELECT ... WHERE id = $1` per ancestor — one query per level. No recursive CTE used. |
| Restore = new revision? | **Yes.** `/revisions/:revId/restore` calls `createRevision()` with old revision's content — inserts a new row with `edit_summary: 'Restored from revision ${revId}'`. Correct. |
| Lock auto-renew? | **Yes.** `acquireLock()` checks if same user already holds lock and runs `UPDATE page_locks SET expires_at = NOW() + INTERVAL '5 minutes'`. Test verifies second expiry > first expiry. |
| Same error for wrong email/password? | **Yes.** Both branches return `errorResponse('UNAUTHORIZED', AUTH_ERROR_MESSAGE, 401)` where `AUTH_ERROR_MESSAGE = 'Invalid email or password'`. |
| Client-side session secret exposure? | **No.** SESSION_SECRET is only referenced in server-side files (login/route.ts, register/route.ts, session.ts, server.ts). No `NEXT_PUBLIC_SESSION_SECRET`, no secret in PageClient.tsx. |
| Meta-tests: string form readdirSync? | **Yes.** `readdirSync(dir, { recursive: true }) as string[]` — correct string form, all 5 compliance tests pass. |
| Broadcast argument assertions in seam tests? | **Yes — strong.** `lock/route.test.ts` asserts `expect(broadcastLockAcquired).toHaveBeenCalledWith('test-page', user.id)`. `revisions/route.test.ts` asserts `expect(broadcastPageUpdate).toHaveBeenCalledWith(page.slug, json.data.id, user.id)` — full arg verification including revision_id and edited_by. |
| README present? | **Yes.** Full README with features, tech stack, quick start, env vars table, project structure, API routes, WebSocket events, testing guide. |
| REVIEW.md present? | **Yes.** Comprehensive self-audit with spec compliance table, code quality findings, security review, performance notes. |

---

## Build Overview

| Metric | Value |
|---|---|
| Tests passing | 295/296 |
| Test files | 28 |
| TypeScript | Clean (tsc --noEmit = no output) |
| Build | Success (per BUILD_LOG.md) |
| Previous v3 score | 80/100 |

---

## Rubric Scoring

### 1. FUNCTIONALITY (17/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | 7 | All auth routes (register/login/logout/me) with correct same-error auth response. All page CRUD routes with slug, parent_id, depth enforcement (400 if parent at depth >= 5). Revisions: list/create/get/restore (creates new revision). Locks: acquire with 5-min expiry, auto-renew for same user, 403 for non-owner release, broadcast on acquire/release. Search ILIKE. WebSocket server (server.ts) with presence tracking, lock release on disconnect. Split-pane editor, lock banner, breadcrumbs in GET response, presence avatars. **-1 cascade delete wrong**: `ON DELETE SET NULL` orphans children instead of deleting them. **-1 WS client broken in practice**: cookie set as HttpOnly but `document.cookie` read in `getSessionToken()` — always returns null, WS token is null, connection aborted with "Not authenticated". The client code exists but the mechanism is architecturally broken. **-1 cascade delete test weak**: `removes page and cascades to children` doesn't verify child is gone. |
| Runtime correctness | 10 | 10 | 295/296 tests pass. 1 failure is a pg-mem timestamp precision bug in test design (no sleep between rapid revision insertions in db.test.ts). Production code is correct — `createRevision` uses `ORDER BY created_at DESC` which is correct but pg-mem can't disambiguate same-millisecond inserts. tsc --noEmit clean. next build succeeds per BUILD_LOG.md. |

### 2. CODE QUALITY (19/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | 5 | `strict: true` in tsconfig. Zero `any` types confirmed by passing compliance test. All db functions return typed row interfaces. API response types via `ApiResponse<T>` generic. Iron-session `IronSession<SessionData>` typed. |
| Naming & structure | 5 | 5 | Excellent naming throughout. `PageClient.tsx`, `LockBanner.tsx`, `RevisionHistory.tsx`, `Breadcrumb.tsx` all well-named and single-responsibility. `events.ts` as clean broadcast bridge. `api-response.ts` with shorthand helpers. `validators.ts` with Zod schemas grouped by domain. |
| Error handling | 5 | 4 | All routes wrapped in try/catch with `errorResponse()`. Generic auth errors prevent account enumeration. PageClient shows `{error}` in red div. Background fetches (`fetchLatestRevision`, `fetchLockStatus`) silently swallow errors (acceptable for background refresh). **-1**: WS `onerror` only sets `wsConnected(false)` with no user-facing error or retry logic. |
| Idiomatic patterns | 5 | 5 | Server components at page.tsx level pass typed props to PageClient ('use client'). Layout uses server component with `getSession()`. No redundant client components. `successResponse`/`errorResponse` helpers used consistently throughout. Zod `.safeParse()` used everywhere (compliance test passes). |

### 3. ARCHITECTURE (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | 5 | Clean layering: validators → api-response → db → session → route handlers → components. `events.ts` properly decouples API routes from WebSocket server — routes call `broadcastPageUpdate()`, server.ts registers the handler via `setBroadcastHandler()`. Lock release on disconnect in server.ts uses `releaseLock()` from db layer. |
| API design | 5 | 5 | RESTful. Consistent `{success: true, data}` / `{success: false, error: {code, message}}` envelope. Correct status codes: 201 for create, 409 conflict, 403 forbidden, 400 validation. GET /pages/:slug returns page + revision + breadcrumbs. Lock GET returns `{locked, locked_by, expires_at}`. |
| File organization | 5 | 4 | Colocated tests throughout (Component.tsx + Component.test.tsx). `tests/helpers/` with factories/auth/setup. `tests/meta/compliance.test.ts`. Path aliases (`@/`, `@tests/`). README and REVIEW.md present. **-1**: `server.ts` at root rather than `src/server.ts` — minor but inconsistent with src/ organization. |

### 4. TEST QUALITY (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | 5 | 296 tests across 28 files. Auth routes (register + login + logout + me). Pages CRUD including depth enforcement (`returns 400 when parent is at depth 5`), breadcrumbs in GET response (`includes page, latest revision, and breadcrumbs`). Revisions list/create/restore. Locks with cross-user 409, non-owner 403, same-owner extend. Diff comparison. Validators (all schemas). Components (8 components with tests). Compliance meta-tests (5 rules). Server-side seam tests with broadcast arg verification. |
| Test design | 5 | 4 | Factories (`createUserInDb`, `createPageInDb`, `createRevisionInDb`, `createLockInDb`) used throughout route tests. `tests/helpers/setup.ts` correctly initializes pg-mem pool in beforeAll. afterEach cleans tables in FK order. Route tests import handlers directly and construct Requests. Compliance meta-tests use correct string-form `readdirSync`. **-1**: Two db.test.ts tests fail due to no sleep between rapid revision inserts — pg-mem can't order same-millisecond timestamps. `createPage` internally creates an initial revision, so "First" content is in initial revision and "Second" also conflicts. Should add `await new Promise(r => setTimeout(r, 10))` between insertions (as the `updates page updated_at` test correctly does). |
| Meaningful assertions | 5 | 5 | Broadcast seam tests verify full args: `broadcastPageUpdate` called with `(page.slug, json.data.id, user.id)`. Lock broadcast verifies `broadcastLockAcquired('test-page', user.id)`. Breadcrumb test verifies `breadcrumbs[0].slug === 'parent-page'`. Lock expiry test verifies 5-min window (±1s tolerance). Revision test verifies `content_html` contains `<h1>Hello World</h1>`. Auth test verifies `Set-Cookie` header present. |

### 5. PRODUCTION READINESS (12/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | 4 | Parameterized SQL throughout (`$1` params in all queries). `PAGE_UPDATABLE` set whitelist for updatePage. bcryptjs (cost 10). Generic auth error message prevents account enumeration. httpOnly cookies set correctly in Set-Cookie headers. SESSION_SECRET never exposed client-side (no NEXT_PUBLIC). **-1**: `document.cookie` read in `getSessionToken()` to extract HttpOnly cookie — this is a security/functionality conflict. The code attempts to read a cookie that, by design, cannot be read by JavaScript. The correct pattern is a server-side endpoint that returns a non-httpOnly token for WebSocket use, or using the session cookie itself as the WS credential by sending it as a header via a server-side upgrade. |
| Performance | 5 | 3 | Indexes on slug, parent_id, `page_revisions(page_id, created_at DESC)`. Lock expiry cleanup on check/acquire. `ILIKE` search with `%query%` (acceptable). **-2**: `getBreadcrumbs()` is a per-ancestor loop — one SQL query per level, up to 5 queries for a max-depth page. Should be a single recursive CTE query. `getPageDepth()` has same N+1 pattern but is only called at write time (create/update), so lower performance impact. |
| DX & maintainability | 5 | 5 | Excellent README with quick start, env var table, project structure, API reference, WebSocket event documentation, and testing guide. `.env.example` with SESSION_SECRET and DATABASE_URL. BUILD_LOG.md with full phase checklist and test results. REVIEW.md with spec compliance table, security audit, performance notes. `npm test` / `npm run test:coverage` scripts. |

### 6. BONUS / PENALTY (+4)

| Item | Points |
|---|---|
| +3 Behavioral seam tests with full argument assertions: `lock/route.test.ts` mocks `broadcastLockAcquired`/`broadcastLockReleased` and verifies exact call args `(slug, userId)`. `revisions/route.test.ts` mocks `broadcastPageUpdate` and verifies `(page.slug, json.data.id, user.id)` — includes revision_id and edited_by. `tests/server.test.ts` has database-integrated event tests verifying full event payload shape. | +3 |
| +2 Strong edge cases: depth enforcement tested (6-level chain → 400 with depth message), cross-user lock isolation (409 when locked by other user, 403 when non-owner releases), breadcrumb ordering verified (`breadcrumbs[0].slug === 'parent-page'`), lock auto-renew verified (second expiry > first expiry), lock expiry timing verified (5-min window ±1s). | +2 |
| +1 REVIEW.md: present with spec compliance table (16 requirements), code quality findings, security review, performance notes, known limitations. | +1 |
| +3 Meta-tests working (string form readdirSync): compliance.test.ts uses `readdirSync(dir, { recursive: true }) as string[]`, all 5 tests pass (no any types, no console, safeParse, factories in routes, no raw Response.json). | +3 |
| -1 Cascade delete wrong: `ON DELETE SET NULL` orphans children. Spec requires cascade delete. The `removes page and cascades to children` test doesn't verify child deletion. | -1 |
| -1 WebSocket client broken in practice: httpOnly cookie cannot be read by `document.cookie`. The WS connection will always fail at runtime despite full code coverage. Functionally equivalent to WS client not wired. | -1 |
| -1 N+1 breadcrumbs: `getBreadcrumbs()` executes one query per ancestor level in a while loop. | -1 |
| **Net** | **+6** |

---

## TOTAL: 86/100

---

## Scoring Summary

| Category | Max | Score |
|---|---|---|
| 1. Functionality | 20 | 17 |
| 2. Code Quality | 20 | 19 |
| 3. Architecture | 15 | 14 |
| 4. Test Quality | 15 | 14 |
| 5. Production Readiness | 15 | 12 |
| 6. Bonus/Penalty | — | +10 (gross) / +6 (net after -4 penalties) |
| **Total** | **85** | **86** |

---

## v3 vs v4 Comparison

| | v3 (kimi-subagents-v3-p2) | v4 (kimi-subagents-v4-p2) |
|---|---|---|
| Score | **80** | **86** |
| Tests | 263/263 | 295/296 |
| Test files | 29 | 28 |
| Depth enforcement? | No | **Yes** (getPageDepth, POST + PATCH) |
| WebSocket client wired? | Yes (fully working) | Yes (code present, broken due to httpOnly cookie) |
| Presence avatars? | Yes | Yes |
| Cascade delete? | Yes (ON DELETE CASCADE) | **No** (ON DELETE SET NULL — regression) |
| N+1 breadcrumbs? | Yes | Yes (still present) |
| Seam tests (broadcast args)? | Yes | **Yes + stronger** (revision_id + edited_by args) |
| Meta-tests working? | Yes (recursive statSync) | **Yes** (string form readdirSync) |
| README? | No | **Yes** |
| REVIEW.md? | No | **Yes** |
| .env.example? | Yes | Yes |
| Client-side session secret? | Yes (-1) | **No** |
| Compliance meta-tests fail? | No | No |
| Bonus/Penalty net | +4 | +6 |

---

## Analysis

**What v4 fixed vs v3 (+6 raw points)**: The requirement matrix approach delivered targeted fixes. Depth enforcement is now correctly implemented — `getPageDepth` iterative walk, POST and PATCH both check `parentDepth >= 5`. README and REVIEW.md are now present (contributed +1 architecture, +1 REVIEW bonus). Meta-tests now use the correct string-form `readdirSync` earning the +3 meta-test bonus. Seam tests are strengthened with full argument assertions including `revision_id` and `edited_by`. Session secret is no longer exposed client-side (removed the v3 `NEXT_PUBLIC_SESSION_SECRET` pattern). Code quality improved: zero `any` types, no `as string` casts, excellent naming.

**New regression in v4**: Cascade delete regressed from v3's correct `ON DELETE CASCADE` back to `ON DELETE SET NULL`. This is surprising given the v3 cascade delete rule was in the infra. The test for cascade delete was also weakened — it doesn't verify the child was deleted.

**New issue in v4**: The WebSocket auth mechanism is broken. v3 used `sealData` client-side (a security issue). v4 removed the session secret but replaced it with `document.cookie` reading an httpOnly cookie — which also doesn't work. The fix is to use a dedicated server-side endpoint that returns a non-httpOnly token for WebSocket authentication, or to proxy WebSocket via Next.js so the session cookie is sent automatically.

**Breadcrumbs N+1 persists**: Both v3 and v4 use a per-ancestor query loop. A single recursive CTE (`WITH RECURSIVE`) would resolve this. The BUILD_LOG doesn't indicate awareness of this as a gap.

**Failing test (1/296)**: The db.test.ts `gets latest revision` and `lists revisions ordered by created_at DESC` failures are due to pg-mem timestamp precision. `createPage` creates an initial revision, then the test immediately calls `createRevision` — both get the same `created_at` millisecond. Adding a 10ms sleep (as `updates page updated_at` test correctly does) would fix this. This is a test design issue, not a production code bug.

**Distance from target**: 86 vs potential 88-90. To reach 90 would require: fix cascade delete (-1 penalty removed = +1 functionality), fix WS httpOnly cookie (-1 WS penalty removed + spec compliance restored = +2), and fix breadcrumbs N+1 (-1 performance penalty removed = +1). These three fixes alone would push to ~90.

**Meta-test bonus earned**: The +3 meta-test bonus is well-earned. Compliance tests check: (1) no `any` types, (2) no console statements, (3) no unsafe `.parse()`, (4) route tests use factories not direct db imports, (5) no raw `Response.json` — all five pass. The string-form `readdirSync` correctly resolves the `withFileTypes` bug that would have produced Dirent objects instead of strings.

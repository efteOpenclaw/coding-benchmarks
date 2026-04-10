# kimi-subagents-v3-p2 Scoring — Project 2: Collaborative Wiki

**Model**: Kimi (via Ollama)
**Infra**: subagents v3 (v2 + participant completeness fix + cascade delete rule)
**Pipeline**: subagent-driven, 12 phases
**Date**: 2026-04-10
**Scored**: 2026-04-10
**Previous v2 score**: 68

---

## Key Questions Answered

| Question | Answer |
|---|---|
| Did WebSocket client get wired? | **Yes, fully.** `PageClient.tsx` has `useEffect` with `new WebSocket()`, `onopen`/`onmessage`/`onclose`/`onerror` handlers, reconnection logic, and all 4 event types handled (page:updated, lock:acquired, lock:released, presence:update). |
| Are presence avatars rendered? | **Yes.** `presenceUsers.map()` renders colored circles with `title="<name> is viewing this page"`. Test in `PageClient.test.tsx` verifies they appear on `presence:update` event. |
| Is cascade delete correct? | **Yes.** Schema uses `parent_id TEXT REFERENCES pages(id) ON DELETE CASCADE`. `deletePage()` issues a single `DELETE FROM pages WHERE slug = $1` and DB cascades children. Route test verifies child is gone after parent delete. |
| Is compliance test findFiles bug fixed? | **Yes, completely.** New `getAllTsFiles()` uses `readdirSync(dir)` + `statSync(fullPath).isDirectory()` recursive traversal — correct paths, real checks. |
| Is depth enforcement implemented? | **No.** POST /api/pages validates parent exists but never checks depth. No `getPageDepth` function anywhere. Spec requires max depth 5 — not enforced, not tested. |
| Are server-side seam tests present? | **Yes.** `lock/route.test.ts` mocks `wikiEvents` and asserts `broadcastLockAcquired(slug, userId)` and `broadcastLockReleased(slug)` called with correct args. |
| Are client-side WebSocket seam tests present? | **Yes.** `PageClient.test.tsx` has 8 tests including: WebSocket opened on mount, `presence:page` sent on open, `presence:update` triggers avatar render, `page:updated` triggers fetch, `lock:acquired` triggers lock fetch. |

---

## Build Overview

| Metric | Value |
|---|---|
| Tests passing | 263/263 |
| Test files | 29 |
| TypeScript | Clean (tsc --noEmit = no output) |
| Build | Success (per BUILD_LOG.md) |
| Previous run | 68/100 (v2) |

---

## Rubric Scoring

### 1. FUNCTIONALITY (19/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | 9 | All auth routes (register/login/logout/me). All page CRUD with slug. Revisions: list/create/get/restore. Locks: acquire/release/check with 5-min expiry, broadcasts. Search ILIKE. WebSocket server with presence tracking. **PageClient.tsx** fully wired: opens WebSocket, sends `presence:page`, handles all 4 event types, renders presence avatars. Cascade delete via `ON DELETE CASCADE`. Split-pane editor (flex 2-column, live preview). **-1**: Depth-5 hierarchy not enforced — POST /api/pages validates parent exists but never checks depth. Spec requires max depth 5. |
| Runtime correctness | 10 | 10 | 263/263 tests pass. tsc --noEmit produces no output. next build succeeds per BUILD_LOG.md. |

### 2. CODE QUALITY (18/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | 4 | `strict: true`. Zero `any` types in `src/`. vitest.config.ts uses `react() as any` (config file, not production code). Lock route uses `as string` for raw pg query column values — acceptable pattern with untyped SQL results. No `as any` anywhere in source. **-1**: The `as string` casts in lock route (15 instances) indicate the route builds its own query instead of using typed db layer — minor but real type gap vs db.ts's typed interfaces. |
| Naming & structure | 5 | 5 | Clean naming throughout. PageClient.tsx, PageEditor.tsx, LockBanner.tsx, Breadcrumb.tsx all well-named. Two-column flex layout for split-pane is idiomatic. Events bridge (events.ts) cleanly named and well-structured. |
| Error handling | 5 | 5 | All routes wrapped in try/catch with `errorResponse()`. Generic auth errors. PageClient shows `{error}` in red div with `role="alert"`. Lock failures set error state and refresh lock status. `fetchLatestRevision` and `fetchLockStatus` silently swallow errors (acceptable for background refresh). |
| Idiomatic patterns | 5 | 4 | Server component at slug/page.tsx passes typed props to PageClient. 'use client' only where needed. Server actions, layout, auth pages all use server components. **-1**: `sealData` called client-side in PageClient to mint session tokens for WebSocket auth — this leaks session secret to browser via `NEXT_PUBLIC_SESSION_SECRET`. Correct pattern would use a server-generated token endpoint. |

### 3. ARCHITECTURE (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | 5 | Clean layering: db.ts → validators.ts → api-response.ts → session.ts → route handlers → components. events.ts as a proper event bridge. WebSocket server (server.ts) listens on events.ts subscriptions and broadcasts to connected clients. |
| API design | 5 | 5 | RESTful. Consistent `{success, data}` / `{success, error: {code, message}}` envelope. Correct status codes (201 for create, 404/401/409 as appropriate). Lock GET returns `{locked, locked_by, locked_at, expires_at}`. Lock POST returns `{locked, lock}`. |
| File organization | 5 | 4 | Colocated tests throughout. `tests/helpers/` with factories/auth/setup. `tests/meta/compliance.test.ts`. Path aliases (`@/`, `@tests/`). **-1**: No README.md. BUILD_LOG.md documents build steps but not setup instructions, env vars, or how to run. |

### 4. TEST QUALITY (13/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | 4 | 263 tests across 29 files: all auth routes, pages CRUD (including cascade delete), revisions, locks (including cross-user 409), search, 10 component tests (including PageClient with WebSocket), lib tests (validators/db/markdown/diff/api-response/events/session), compliance (5 rules). **-1**: No depth enforcement test (since not implemented). No cross-user page edit isolation test. |
| Test design | 5 | 5 | Factories (`createUserInDb`, `createPageInDb`, `createRevisionInDb`, `createLockInDb`) used throughout route tests. setup.ts correctly uses `testPool.end()` in afterAll — not `closePool()`. afterEach cleans all tables in correct FK order. Compliance tests use real file traversal via `statSync`. PageClient tests mock `global.WebSocket` with factory function. |
| Meaningful assertions | 5 | 4 | Revisions test verifies `revisions[0].content_markdown === '# Second'` (not just array length). Register test verifies `password_hash` absent from response, `set-cookie` header present. Lock test verifies `broadcastLockAcquired` called with exact `(slug, userId)`. PageClient test verifies presence avatars by `getByTitle('Other User is viewing this page')`. **-1**: Some route tests only check status + error code without verifying full response shape. Restore revision test coverage is thin on behavioral assertions. |

### 5. PRODUCTION READINESS (12/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | 4 | Parameterized SQL throughout. `PAGE_UPDATABLE` column whitelist for updates. bcryptjs (cost 10 implicit). Generic auth errors. httpOnly cookies via iron-session. `ON DELETE CASCADE` in FK constraints. **-1**: `sealData` client-side with `NEXT_PUBLIC_SESSION_SECRET` exposes session secret to browser. An attacker can forge session tokens if the secret leaks. Correct pattern: server-side token endpoint. |
| Performance | 5 | 3 | Indexes on slug, parent_id, `page_revisions(page_id, created_at DESC)`. No N+1 in revision queries (ordered index). Lock expiry cleanup on check/acquire (acceptable). **-2**: `getBreadcrumbs` iterates per-ancestor with individual `SELECT` per level (N+1 loop). Could be single recursive CTE. No index on `page_locks.locked_by`. `ensureUniqueSlug` does sequential queries until unique found (acceptable for low volume). |
| DX & maintainability | 5 | 5 | BUILD_LOG.md with full phase checklist and final validation results. `.env.example` with commented DATABASE_URL, SESSION_SECRET, NODE_ENV. vitest.config.ts and tsconfig.json properly configured. Path aliases. Clean project structure with colocated tests. |

### 6. BONUS / PENALTY (+5)

| Item | Points |
|---|---|
| +3 Behavioral seam tests covering **both** server-side AND client-side WebSocket wiring: lock route test mocks `wikiEvents` and verifies `broadcastLockAcquired(slug, userId)` + `broadcastLockReleased(slug)`. PageClient.test.tsx verifies `new WebSocket()` called, `presence:page` sent on open, `presence:update` renders avatars, `page:updated` triggers fetch. | +3 |
| +2 Strong edge cases: cascade delete verified (child 404 after parent delete), cross-user lock isolation (409 when locked by other), release returns 404 for non-owner, presence avatars filter out current user from display | +2 |
| -1 Depth enforcement missing: POST /api/pages never checks depth. Spec requires max depth 5 — a parent can be nested arbitrarily deep. No `getPageDepth` function exists anywhere. | -1 |
| No REVIEW.md or self-audit | 0 |
| No meta-test bonus (compliance tests work but are not "meta-tests that actually run behavior checks" — they check code patterns, not runtime behavior) | 0 |
| **Net** | **+4** |

---

## TOTAL: 80/100

---

## Scoring Summary

| Category | Max | Score |
|---|---|---|
| 1. Functionality | 20 | 19 |
| 2. Code Quality | 20 | 18 |
| 3. Architecture | 15 | 14 |
| 4. Test Quality | 15 | 13 |
| 5. Production Readiness | 15 | 12 |
| 6. Bonus/Penalty | — | +4 |
| **Total** | **85** | **80** |

---

## v2 vs v3 Comparison

| | v2 (kimi-subagents-v2-p2) | v3 (kimi-subagents-v3-p2) |
|---|---|---|
| Score | **68** | **80** |
| Tests | 101/101 | 263/263 |
| Test files | 27 | 29 |
| WebSocket client wired? | No (PageClient deaf) | **Yes** (full useEffect + handlers) |
| Presence avatars in UI? | No | **Yes** (rendered on presence:update) |
| Cascade delete? | No (orphans children) | **Yes** (ON DELETE CASCADE + test) |
| Compliance tests work? | No (findFiles bug, vacuous) | **Yes** (fixed recursive traversal) |
| Server-side seam tests? | Yes (3, working) | **Yes** (lock route mock + assert) |
| Client-side WebSocket tests? | No | **Yes** (8 tests in PageClient.test.tsx) |
| Depth enforcement? | No | No (still missing) |
| Split-pane editor? | Yes (grid 2-col) | Yes (flex 2-col, live preview) |
| README? | No | No |
| N+1 breadcrumbs? | Yes | Yes |
| Security (sealData client-side) | N/A | -1 (leaks session secret) |

## Analysis

**What v3 fixed vs v2 (+12 points)**: The participant completeness fix delivered the highest-value improvements: WebSocket client is now fully wired (was the single biggest spec gap at -2 penalty, now earns +3 bonus for seam tests). Presence avatars rendered. Cascade delete correct. Compliance tests fixed. These four changes collectively shifted ~15 raw points plus converted -3 net bonus/penalty into +4 net.

**Seam test quality jump**: v3 has behavioral seam tests on both sides of the WebSocket boundary. Server-side: lock route mocks events.ts and verifies broadcast called with correct args. Client-side: PageClient.test.tsx mocks `global.WebSocket`, simulates messages, and asserts DOM changes (avatar titles). This is exactly what the rubric means by "behavioral seam tests covering both server-side AND client-side WebSocket wiring."

**Remaining gaps**: Depth enforcement (-1 functionality, no test) and N+1 breadcrumbs (-2 performance) are the two main structural issues carried from v2. The `sealData` client-side security issue is new to v3 — a consequence of wiring WebSocket auth from the client without a proper server token endpoint.

**Distance from target (88)**: 80 vs target 88. Gap is 8 points. To reach 88 would require: depth enforcement (+1 functionality, +1 test coverage ~+1), README (+1 architecture), breadcrumbs N+1 fix (+1 performance), sealData security fix (+1), stronger assertions (+1 test quality), and resolving the `as string` pattern in lock route (+1 type safety). Most of these are straightforward mechanical fixes.

**v3 vs kimi-metatests-v2-p2 single-shot best (91)**: 80 vs 91. Single-shot still wins by 11 points, largely because single-shot had depth enforcement, used recursive CTE for breadcrumbs, and had a README. The subagent pipeline excels at test quality and WebSocket architecture but misses depth validation.

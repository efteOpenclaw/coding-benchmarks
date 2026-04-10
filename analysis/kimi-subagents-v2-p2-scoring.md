# kimi-subagents-v2-p2 Scoring — Project 2: Collaborative Wiki

**Model**: Kimi (via Ollama)
**Infra**: subagents v2 (intent framing + behavioral seam tests)
**Pipeline**: subagent-driven, 12 phases (vs Opus 6)
**Date**: 2026-04-09
**Scored**: 2026-04-10
**Previous v1 score**: DNF (pg-mem pool lifecycle bug: route tests called closePool(), 83 tests required real PG)

---

## Key Questions Answered

| Question | Answer |
|---|---|
| Did pg-mem lifecycle rules fix the DNF? | **Yes.** 101/101 tests pass. setup.ts uses `testPool.end()` (not `closePool()`). No route test calls `closePool()`. |
| Did 12 phases vs 6 cause more seam problems? | **No major new seam problems.** Seam tests in Phase 11 correctly verify broadcastPageUpdate/Lock via vi.mock. WebSocket server-side wiring is clean. |
| Is WebSocket wired to UI? | **No.** Client (PageClient.tsx) does not consume WebSocket events. No presence avatars rendered. No real-time update hook. Server emits correctly but UI is deaf. |
| findFiles compliance bug persists? | **Yes.** Same bug: `join(dir, entry.name)` with `recursive:true` produces wrong paths (e.g., `src/db.ts` instead of `src/lib/db.ts`). All 5 meta-tests pass vacuously (readSafe returns `""` for non-existent paths). |

---

## Build Overview

| Metric | Value |
|---|---|
| Tests passing | 101/101 |
| Test files | 27 |
| TypeScript | Clean (tsc --noEmit = no output) |
| Build | Success (per BUILD_LOG.md) |
| Previous run | DNF |

---

## Rubric Scoring

### 1. FUNCTIONALITY (16/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | 8 | All auth routes (register/login/logout/me). All page CRUD routes. Revisions: list/create/get/restore. Locks: acquire/release/check with broadcasts. Search ILIKE. WebSocket server presence tracking and event wiring. **-1**: No split-pane UI (PageEditor uses `grid grid-cols-2` preview — technically present). **-1**: No presence avatars in UI (WebSocket is deaf client-side). **-1**: cascade delete not implemented (deletePage deletes only the target row; no child cascade logic in db.ts). Max depth `getPageDepth` defined but never called in route handlers — depth-5 rule not enforced. |
| Runtime correctness | 10 | 8 | 101/101 tests pass. tsc clean. next build succeeds. **-2** for missing depth enforcement and missing cascade delete (both spec violations with runtime consequences). |

### 2. CODE QUALITY (18/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | 5 | `strict: true`. Zero `any` types found in source (grep + manual review both clean). z.infer type exports. Route handlers fully typed with generic NextResponse<T>. |
| Naming & structure | 5 | 5 | Clean naming throughout. PageClient.tsx, PageEditor.tsx, LockBanner.tsx all well-named. Component files modestly sized. db.ts is long (~330 lines) but well-organized. |
| Error handling | 5 | 4 | All routes wrapped in try/catch returning `errorResponse()`. Generic auth errors ("Invalid email or password"). PageClient handles save/restore failures via `res.ok` check. **-1**: No error state shown to user on failed save (just `setIsEditing(false)` on success, but no UI feedback on failure). |
| Idiomatic patterns | 5 | 4 | Server component for slug/page.tsx passes all data to PageClient. 'use client' only where needed. Layout is a proper async server component. **-1**: SearchBox takes server action callbacks from layout — architecturally awkward; onSelect calls server `redirect()` inside a client callback, which silently fails (redirect in server action from client). |

### 3. ARCHITECTURE (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | 5 | Clean layering: db.ts → validators.ts → api-response.ts → session.ts → route handlers → components. events.ts as a proper event bridge between routes and WebSocket server. |
| API design | 5 | 5 | RESTful. Consistent `{success, data}` / `{success, error: {code, message}}` envelope via `successResponse`/`errorResponse` helpers. Correct status codes (201 for create, 404/401/409 as appropriate). Lock check returns nested `{data: {status: ...}}`. |
| File organization | 5 | 4 | Colocated tests (route.test.ts next to route.ts, component.test.tsx next to component.tsx). tests/helpers/ with factories/auth/setup. Path aliases (@/, @tests/). **-1**: No README.md (BUILD_LOG.md exists but not a real README with setup instructions). |

### 4. TEST QUALITY (11/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | 4 | 101 tests across 27 files: auth routes (all 4), pages routes, revisions, locks, search, 9 component tests, lib tests (validators/db/markdown/diff/api-response), seam tests (3), compliance (5). **-1**: No test for depth enforcement (unenforceable since route doesn't call getPageDepth). No test for cascade delete. No cross-user isolation test for page edits. |
| Test design | 5 | 4 | Factories (createUserInDb, createPageInDb, createRevisionInDb, createLockInDb) actually used in tests. setup.ts correctly uses `testPool.end()` in afterAll — not closePool(). afterEach cleans all tables. **-1**: broken findFiles in compliance.test.ts (same bug as Opus v2) — 5 meta-tests pass vacuously since `join(dir, entry.name)` with recursive yields wrong paths, readSafe returns "" for all, so no violations found. |
| Meaningful assertions | 5 | 3 | Tests verify slug generation, 409 for duplicate, cookie set on register, password_hash absent from response, lock 409 cross-user, release 404 for non-owner. Seam tests verify mocks called with correct args. **-2**: Many tests only check status code (GET /revisions just checks `Array.isArray`). No assertions on breadcrumb content. No depth-enforcement assertion. |

### 5. PRODUCTION READINESS (12/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | 5 | Parameterized SQL throughout. `PAGE_UPDATABLE` column whitelist for updates. bcryptjs cost 10. Generic auth errors ("Invalid email or password"). httpOnly cookies via iron-session. Revision cross-page validation (`oldRevision.page_id !== page.id`). |
| Performance | 5 | 3 | Unique indexes on primary keys and slug. No N+1 in revisionsByPageSlug (JOIN). **-2**: getBreadcrumbs uses iterative per-ancestor queries (N+1 loop). getPageDepth also N+1 loop. No index on `page_revisions.page_id` or `page_locks.locked_by`. Lock expiry cleanup on every check (acceptable). |
| DX & maintainability | 5 | 4 | BUILD_LOG.md with phase checklist and final results. .env.example with comments. vitest.config.ts and tsconfig properly set up. **-1**: No README.md. No migration script (initDb inline is fine for prototypes but not production). |

### 6. BONUS / PENALTY (-1)

| Item | Points |
|---|---|
| +3 Behavioral seam tests: 3 tests in tests/integration/seam.test.ts verify broadcastPageUpdate/LockAcquired/LockReleased called with correct args | +3 |
| -2 WebSocket seam problem: server-side wiring is correct (events.ts → server.ts), but UI never consumes WebSocket events. No useEffect/WebSocket hook in PageClient.tsx or layout. No presence avatars. Client is completely deaf to real-time events. | -2 |
| -2 Broken compliance tests: findFiles bug — `join(dir, entry.name)` with recursive:true creates wrong paths (e.g., `src/db.ts` not `src/lib/db.ts`). readSafe() returns "" for all. All 5 compliance checks pass vacuously. Confirmed by Node.js runtime test: 35 paths found, 0 valid. | -2 |
| -1 Cascade delete wrong: `deletePage()` issues `DELETE FROM pages WHERE slug = $1` with no child handling. No FK CASCADE in schema (pg-mem compatible schema strips FK). Children become orphaned (parent_id points to deleted page). | -1 |
| -1 Depth not enforced: `getPageDepth` defined in db.ts but never imported or called from route handlers. POST /api/pages does not check depth. Spec requires max depth 5. | -1 |
| **Net** | **-3** |

---

## TOTAL: 68/100

---

## Scoring Summary

| Category | Max | Score |
|---|---|---|
| 1. Functionality | 20 | 16 |
| 2. Code Quality | 20 | 18 |
| 3. Architecture | 15 | 14 |
| 4. Test Quality | 15 | 11 |
| 5. Production Readiness | 15 | 12 |
| 6. Bonus/Penalty | — | -3 |
| **Total** | **85** | **68** |

---

## v1 vs v2 Comparison

| | v1 (kimi-subagents-p2) | v2 (kimi-subagents-v2-p2) |
|---|---|---|
| Score | DNF | **68** |
| Tests | DNF (pg-mem lifecycle bug) | 101/101 |
| pg-mem bug fixed? | No | Yes (`testPool.end()` not `closePool()`) |
| WebSocket server wired? | N/A | Yes (events.ts bridge works) |
| WebSocket in UI? | N/A | No (client never connects) |
| Seam tests? | No | Yes (3, working) |
| Compliance tests work? | N/A | No (same findFiles bug) |
| Cascade delete? | N/A | No (orphans children) |
| Depth enforcement? | N/A | No (getPageDepth defined but not called) |
| Split-pane editor? | N/A | Yes (grid 2-col with live preview) |
| README? | N/A | No |

## Analysis

**What v2 fixed vs v1 DNF**: The pg-mem lifecycle fix was the most critical improvement. Using `testPool.end()` directly (not the exported `closePool()`) and using a single shared pg-mem instance via `setPool()` gave all 101 tests clean isolation. This directly addresses the DNF-causing bug.

**12-phase pipeline effect**: More phases did not introduce compounding seam failures. The server-side WebSocket architecture is well-structured with a clean events.ts bridge. Phase 11 seam tests verify the server-side contract. However, the client-side WebSocket consumer (the most visible end-user feature) was never built — this is a significant spec omission that 12 phases didn't catch.

**Structural gaps vs Opus v2 P1 (93/100)**:
- Opus P1 scored 93 on a simpler spec with complete UI features. Kimi P2 scores 68 on a harder spec.
- Core quality (type safety, route design, error handling) is solid for both.
- Kimi's main losses: missing UI real-time features (WebSocket client), cascade delete, depth enforcement, and weaker test assertions.
- The compliance test findFiles bug persists across both models — this is a systemic issue in the scaffold.

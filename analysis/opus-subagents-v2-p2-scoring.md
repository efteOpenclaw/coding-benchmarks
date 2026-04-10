# opus-subagents-v2-p2 Scoring — Project 2: Collaborative Wiki

**Model**: Opus  
**Infra**: subagents v2 (intent framing + behavioral seam tests)  
**Pipeline**: subagent-driven, 6 phases + Round 2 audit  
**Date**: 2026-04-09  
**Scored**: 2026-04-10  
**Previous v1 score**: opus-subagents-p2 = 88 (WebSocket seam problem: broadcasts never wired to routes)

---

## Build Overview

| Metric | Value |
|---|---|
| Tests passing | 216/216 |
| Test files | 27 |
| TypeScript | Clean (0 errors) |
| Build | Success |
| Phases | 6 phases + Round 2 audit |

---

## Key Question Answer

**Did behavioral seam tests in v2 fix the WebSocket seam problem?**

Partially. The v2 seam tests verified the **server-side seam** (routes → broadcast.ts → server.ts), and that layer works correctly. However, the **client-side seam** (UI consuming WebSocket events) was never implemented. `PageClient.tsx` and `AppShell.tsx` contain no WebSocket connection, no `useEffect` that opens a socket, and no presence avatars. The seam tests caught one half of the problem but missed the other half: real-time events are broadcast to nobody.

**Does the findFiles compliance bug persist?**

Yes. Same bug as v1-p1: `join(dir, entry.name)` ignores `parentPath` for recursive entries. Out of 64 matching entries, only 1 (the root-level `global.d.ts`) actually exists on disk. All 5 compliance checks pass vacuously on essentially no files.

---

## Rubric Scoring

### 1. FUNCTIONALITY (16/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | 8 | All API routes implemented: auth (register/login/logout/me), pages CRUD with depth, revisions with restore, locks with 5-min expiry, search (ILIKE). WebSocket server exists with presence tracking and lock broadcasts. **-2**: No client-side WebSocket consumption — presence avatars not rendered, lock events don't update UI in real-time, page:updated events ignored. |
| Runtime correctness | 10 | 8 | 216/216 tests pass. tsc clean. Build succeeds. **-2**: cascade delete bug (parent_id SET NULL instead of CASCADE — deleting a parent orphans children rather than cascading), no DB indexes defined anywhere. |

### 2. CODE QUALITY (19/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | 5 | strict: true. Zero `any`. All rows typed (UserRow, PageRow, PageRevisionRow, PageLockRow). Proper z.infer usage. Route handlers explicitly typed `Promise<NextResponse>`. |
| Naming & structure | 5 | 5 | Clean naming throughout. db.ts focused on data layer. Components well-named and single-purpose. PageClient.tsx at 297 lines (reasonable). |
| Error handling | 5 | 5 | All 11 route handlers wrapped in try/catch. JSON parse wrapped separately. Error states in UI (loadError state, disabled buttons). Round 2 audit specifically added missing error handling. |
| Idiomatic patterns | 4 | 4 | Server components where appropriate. 'use client' only in AppShell, PageClient, and components. useCallback with correct deps. **-1**: broadcast module pattern introduces a global mutable singleton which is technically a code smell, though pragmatically justified. |

### 3. ARCHITECTURE (13/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | 5 | Clean layering: db.ts (all SQL) → validators.ts (Zod) → api-response.ts (envelope) → session.ts → routes → components. No SQL in route handlers. PAGE_UPDATABLE whitelist for safe dynamic UPDATE. broadcast.ts decouples WebSocket from routes. |
| API design | 5 | 4 | RESTful. Consistent successResponse/errorResponse envelope. Correct status codes (201, 400, 401, 404, 409, 500). **-1**: lock GET returns full lock data including user join, but `locked_by` is just a userId string, not a resolved user object — UI displays user ID not display_name in lock banner. |
| File organization | 4 | 4 | Colocated tests throughout. tests/helpers/ with setup, factories, auth. Path aliases. **-1**: No indexes file or migration concept — schema lives entirely in initDb() which is fine but DB setup has no rollback path. |

### 4. TEST QUALITY (12/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | 4 | Strong route coverage. 7 seam tests. Component tests for all 9 components. **-1**: No test for cascade delete behavior (would have caught the SET NULL bug). No depth-limit enforcement test in route layer. No cross-user lock isolation test. |
| Test design | 5 | 3 | Factories (createUserInDb, createPageInDb, createRevisionInDb) are real and actively used in seam/route tests. pg-mem lifecycle correct (beforeAll/afterEach/afterAll). No closePool in tests. **-2**: findFiles bug persists — compliance tests scan only 1 real file out of 64, all 5 pass vacuously. This is the same unfixed bug from v1-p1. |
| Meaningful assertions | 5 | 5 | Seam tests verify broadcast function is called with correct args (not just status codes). Route tests verify response shape, forbidden access, content_html rendered. Revision test verifies HTML contains `<h1`. |

### 5. PRODUCTION READINESS (13/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | 5 | Parameterized SQL throughout. PAGE_UPDATABLE whitelist prevents SQL injection in dynamic UPDATE. bcrypt (bcryptjs cost 10). Generic auth error: "Invalid email or password" (same message for missing user vs wrong password). HttpOnly cookie set explicitly. iron-session for sealed session tokens. |
| Performance | 4 | 3 | No N+1 in breadcrumbs (iterative with early-exit). Search uses JOIN (no N+1). Lock cleanup on every check (reasonable). **-2**: No database indexes defined anywhere — no index on pages.slug, pages.parent_id, page_revisions.page_id, or page_locks.expires_at. For any real workload this would be slow. getBreadcrumbs and getPageDepth do N sequential queries (N = depth, max 5 — acceptable for max depth 5 but could be a CTE). |
| DX & maintainability | 5 | 5 | README with feature list, tech stack, scripts. .env.example. BUILD_LOG.md with 6 phases + Round 2 audit. REVIEW.md with arch decisions and known limitations. |

### 6. BONUS / PENALTY (-1)

| Item | Points |
|---|---|
| +3 Behavioral seam tests: 7 tests in tests/integration/seam.test.ts verify broadcastPageUpdate, broadcastLockAcquired, broadcastLockReleased are called from routes | +3 |
| +1 REVIEW.md present with architecture decisions and known limitations | +1 |
| -2 WebSocket seam problem (UI never opens WebSocket connection — no client hook, no presence avatars, lock events not consumed in real-time) | -2 |
| -2 Broken compliance tests (findFiles bug: only 1/64 files scanned, all 5 meta-tests pass vacuously) | -2 |
| -1 Cascade delete wrong: parent_id uses ON DELETE SET NULL instead of CASCADE — spec requires cascade delete of children | -1 |
| **Net** | **-1** |

---

## TOTAL: 72/100

---

## Score Breakdown

| Category | Max | Score |
|---|---|---|
| Functionality | 20 | 16 |
| Code Quality | 20 | 19 |
| Architecture | 15 | 13 |
| Test Quality | 15 | 12 |
| Production Readiness | 15 | 13 |
| Bonus/Penalty | — | -1 |
| **TOTAL** | **85** | **72** |

---

## v1 vs v2 Comparison

| | v1 (opus-subagents-p2) | v2 (opus-subagents-v2-p2) |
|---|---|---|
| Score | 88 | 72 |
| Tests | unknown | 216/216 |
| Server-side WS broadcast wired? | No | Yes |
| Client-side WS consumed? | No | No |
| Behavioral seam tests? | No | Yes (7) — but only test server side |
| Cascade delete correct? | unknown | No (SET NULL) |
| Compliance tests work? | unknown | No (same findFiles bug) |
| REVIEW.md? | No | Yes |

**Regression analysis**: v2 scores lower than v1 (72 vs 88) despite better seam infrastructure. The v2 seam tests successfully wired the server-side broadcast path (routes → broadcast.ts → server.ts) which v1 missed entirely. However, the client-side half — a WebSocket hook in PageClient or AppShell — was never implemented. This means the seam tests created a false sense of correctness: they verified routes emit events, but nobody tested (or implemented) the UI consuming them. The cascade delete bug and missing DB indexes are additional regressions vs v1. The findFiles compliance bug also persists from v1-p1.

**Key finding (F24 candidate)**: Behavioral seam tests only fixed the layer they targeted (route→broadcast). The client-side seam (component→WebSocket) was outside the seam test scope and went unimplemented. The intent framing should have specified both seam directions, not just the server-side one.

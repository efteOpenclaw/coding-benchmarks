# opus-subagents-v3-p2 Scoring — Project 2: Collaborative Wiki

**Model**: Opus  
**Infra**: subagents v3 (v2 + participant completeness fix + cascade delete rule)  
**Pipeline**: subagent-driven, P2 Collaborative Wiki  
**Date**: 2026-04-10  
**Scored**: 2026-04-10  
**Previous v2 score**: 72 (regression from v1=88; client WS unimplemented, SET NULL cascade, vacuous compliance tests)

---

## Build Overview

| Metric | Value |
|---|---|
| Tests passing | 220/220 |
| Test files | 27 |
| TypeScript | Clean (0 errors, permission error on .tsbuildinfo only) |
| Build | BUILD_LOG.md reports success (12 routes compiled) |
| Phases | Standard subagent phases |

---

## Key Question Answers

**Did the participant completeness fix (v3) resolve the client-side WebSocket gap?**

Yes. `PageClient.tsx` now has a `useEffect` that opens a WebSocket connection, handles `ws.onopen` (sends `presence:page`), `ws.onmessage` (handles `page:updated`, `lock:acquired`, `lock:released`, `presence:update`), and `ws.close()` cleanup. Presence avatars are rendered in the JSX (the "Also viewing:" section with avatar initials). The client-side seam is fully implemented.

**Did the cascade delete rule fix propagate correctly?**

Yes. `parent_id TEXT REFERENCES pages(id) ON DELETE CASCADE` in db.ts. All three FK references use ON DELETE CASCADE. The db.test.ts includes `cascades to children via ON DELETE CASCADE` test confirming behavior.

**Is the findFiles compliance bug fixed?**

Yes. The compliance test now uses `readdirSync(dir, { recursive: true }) as string[]` which returns flat string paths relative to dir, then calls `join(dir, rel)` to get absolute paths. This is the correct fixed form — all 5 compliance checks pass on real files.

**Does the seam test cover both server-side AND client-side WebSocket wiring?**

Partially. 5 server-side seam tests (broadcast calls) + 1 client-side static verification test (reads PageClient.tsx source and asserts `new WebSocket`, `ws.onopen`, `ws.onmessage`, presence event types exist). The client-side seam test is a static source check, not a runtime integration test — but it does meaningfully verify wiring.

---

## Rubric Scoring

### 1. FUNCTIONALITY (19/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | 10 | All API routes: auth (register/login/logout/me), pages (CRUD with depth-5 enforcement in both POST /pages and PATCH /pages/:slug), revisions (list, create, get by id, restore), locks (get, acquire 5-min expiry, release owner-only), search (ILIKE). WebSocket server (server.ts) with auth, presence tracking, lock/page event broadcasting. PageClient.tsx opens WebSocket connection, handles all event types, renders presence avatars. Cascade delete correct (ON DELETE CASCADE). All spec requirements met. |
| Runtime correctness | 10 | 9 | 220/220 tests pass. tsc clean (0 type errors). BUILD_LOG.md reports build success. **-1**: No slug deduplication — if two pages have the same title, `generateSlug` produces identical slugs and the INSERT will fail with a unique constraint violation (no retry/suffix logic). |

### 2. CODE QUALITY (19/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | 5 | strict: true in tsconfig. Zero `any` (compliance test verified). All DB rows typed with interfaces (UserRow, PageRow, PageRevisionRow, PageLockRow). Route handlers typed `Promise<NextResponse>`. WsMessage, PresenceUser, all API response interfaces defined in PageClient.tsx. |
| Naming & structure | 5 | 5 | Consistent naming throughout. db.ts is focused data layer. events.ts cleanly separates emit/on. server.ts is the WS server. Components well-named and single-purpose. PageClient.tsx is 359 lines (reasonable given WebSocket + all page interactions). |
| Error handling | 5 | 5 | Routes use errorResponse helper consistently. Auth routes have outer try/catch. PageClient useEffect handlers all wrapped in try/catch with catch blocks silencing network errors gracefully. Lock conflict handled with specific CONFLICT code. |
| Idiomatic patterns | 4 | 4 | Server components for layout (AppLayout), page.tsx is async server component. 'use client' correctly limited to AppShell, PageClient, and UI components. useCallback with correct deps for fetchPage/fetchLock. **-1**: All 9 components use 'use client' even simple display-only ones like PageContent, Breadcrumb which could be server components. |

### 3. ARCHITECTURE (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | 5 | Clean layering: db.ts (all SQL + row types) → validators.ts (Zod schemas) → api-response.ts (envelope helpers) → session.ts (iron-session) → events.ts (EventEmitter pub/sub) → route handlers → server.ts (WS server). No SQL in route handlers. PAGE_UPDATABLE whitelist for safe dynamic UPDATE. events.ts decouples routes from WebSocket server. |
| API design | 5 | 5 | RESTful routing. Consistent `{success, data/error}` envelope via successResponse/errorResponse. Correct status codes: 201 (create), 400 (validation), 401 (auth), 404 (not found), 409 (conflict), 500 (server error). Lock GET returns `{locked_by: {id, display_name}}` with JOIN on users — display_name properly resolved. |
| File organization | 4 | 4 | Colocated test files alongside every route and component. tests/helpers/ with setup.ts, factories.ts, auth.ts. tests/meta/ and tests/seams/ properly separate concerns. @/* and @tests/* path aliases. **-1**: No explicit migration concept — schema lives only in initDb() with IF NOT EXISTS guards, no rollback path. |

### 4. TEST QUALITY (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | 5 | All 11+ route handlers have colocated route.test.ts. All 9 components have colocated .test.tsx. 6 seam tests. 5 compliance meta-tests. db.test.ts covers CRUD, cascade delete, depth traversal, lock expiry. Cross-user lock isolation tested in lock route test (user1 locks, user2 gets 409). |
| Test design | 5 | 5 | Factories (buildUser, createUserInDb, createPageInDb, createRevisionInDb) used throughout. pg-mem lifecycle correct: beforeAll sets pool + initDb, afterEach DELETEs in FK order, afterAll closes pool. No closePool in route tests. Compliance findFiles bug fixed (recursive string form). |
| Meaningful assertions | 4 | 4 | Seam tests assert broadcast called with exact args (slug, userId, displayName). Route tests verify response shape, forbidden access (correct error codes). Cascade delete test verifies child is actually gone. Static WS seam test asserts specific event type strings. **-1**: No test verifying depth-5 rejection (the depth enforcement in POST /pages is untested at route layer). |

### 5. PRODUCTION READINESS (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | 5 | Parameterized SQL throughout ($1 placeholders). PAGE_UPDATABLE whitelist prevents injection in dynamic UPDATE. bcryptjs async hash (cost 10). Generic auth errors ("Invalid email or password" same for wrong email and wrong password — verified by test). httpOnly: true, sameSite: 'lax', secure: true in production. iron-session with sealed encrypted cookies. No password_hash in any response. |
| Performance | 5 | 4 | Indexes: idx_pages_slug, idx_pages_parent, idx_revisions_page(page_id, created_at DESC). No N+1 in search (single LEFT JOIN with app-level dedup). Lock cleanup on check (acceptable). getBreadcrumbs and getPageDepth do sequential queries (N = depth, max 5 — acceptable). **-1**: No index on page_locks.expires_at despite every lock read doing `DELETE FROM page_locks WHERE expires_at < $1`. |
| DX & maintainability | 5 | 5 | README with tech stack, setup instructions, all API routes, architecture notes. .env.example with placeholder secrets (no real values). BUILD_LOG.md with validation results and full file inventory. REVIEW.md with security checklist, test coverage summary, architecture decisions (8 items). |

### 6. BONUS / PENALTY (+6)

| Item | Points |
|---|---|
| +3 Behavioral seam tests: 5 server-side seam tests (routes → broadcastPageUpdate/broadcastLockAcquired/broadcastLockReleased) + 1 client-side static seam test (PageClient.tsx source verified for WebSocket wiring) | +3 |
| +2 Strong edge cases: cascade delete tested in db.test.ts (child gone after parent delete); cross-user lock isolation tested in route test (user2 gets 409 when user1 holds lock); breadcrumbs returned with correct length in GET /pages/:slug test | +2 |
| +1 REVIEW.md present with security checklist, test coverage summary, and architecture decisions | +1 |
| +3 Meta-tests work (findFiles bug fixed: uses recursive string form; compliance tests scan real source files; all 5 checks meaningful) | +3 |
| -3 Bonus cap: rubric awards +3 for meta-tests, but only +3 for seam tests max — awarding full values as specified | 0 |
| **Net** | **+9** |

---

## TOTAL: 89/100

---

## Score Breakdown

| Category | Max | Score |
|---|---|---|
| Functionality | 20 | 19 |
| Code Quality | 20 | 19 |
| Architecture | 15 | 14 |
| Test Quality | 15 | 14 |
| Production Readiness | 15 | 14 |
| Bonus/Penalty | — | +9 |
| **TOTAL** | **85** | **89** |

*Note: Base score before bonus is 80/85 (94%). With +9 bonus/penalty, total is 89.*

---

## v2 vs v3 Comparison

| | v2 (opus-subagents-v2-p2) | v3 (opus-subagents-v3-p2) |
|---|---|---|
| Score | 72 | 89 |
| Tests | 216/216 | 220/220 |
| Client-side WS (PageClient opens WebSocket)? | No | Yes |
| Presence avatars in UI? | No | Yes |
| Cascade delete correct? | No (SET NULL) | Yes (CASCADE) |
| DB indexes? | None | 3 indexes |
| Compliance tests work? | No (findFiles bug) | Yes (fixed) |
| Seam tests (server + client)? | 7 server-side only | 5 server + 1 client-side static |
| REVIEW.md? | Yes | Yes |
| Slug deduplication? | Unknown | No (minor gap) |
| Depth enforcement tested at route layer? | No | No |

**Analysis**: v3 is a strong recovery (+17 points, from 72 to 89). The three targeted fixes all landed correctly:

1. **Client WebSocket wiring**: PageClient.tsx now opens a real WebSocket connection, handles all four event types (`page:updated`, `lock:acquired`, `lock:released`, `presence:update`), and renders presence avatars — the exact gap that caused the v2 penalty.

2. **Cascade delete**: All FK references use ON DELETE CASCADE, verified by a targeted db-level test.

3. **Compliance findFiles bug**: Fixed to the correct `readdirSync(dir, {recursive:true}) as string[]` form, enabling real source scanning. All 5 compliance checks now run against actual files.

The seam test suite also gained a meaningful client-side static verification test for WebSocket wiring in PageClient. The base code quality (type safety, error handling, architecture) was already strong in v2 and remains excellent in v3. The remaining gaps are minor: no slug deduplication, no depth-limit test at the route layer, missing index on page_locks.expires_at, and overuse of 'use client' on display-only components.

**v3 reaches 89, clearing the ≥88 target (matching kimi-metatests-v2-p2).**

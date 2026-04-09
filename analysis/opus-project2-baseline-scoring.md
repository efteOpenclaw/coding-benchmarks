# Opus Baseline — Project 2: Collaborative Notes Wiki

**Model**: Opus  
**Infra**: none (baseline — no skills, no templates)  
**Pipeline**: single-agent  
**Date**: 2026-03-31  
**Location**: /app/runs/260331-opus/ (overwrote the original project-1 baseline)

---

## Build Overview

| Metric | Opus P2 baseline | Kimi P2 baseline (37) |
|---|---|---|
| Source files | ~45 | ~30 |
| Test files | 9 (4 lib + 4 API + 1 component) | 0 |
| Tests | 72 | 0 |
| Console statements | **0** | 17 |
| `any` types | **0** | 5 |
| Components | 12 (auth, sidebar, editor, viewer, tree, search, breadcrumbs, lock, presence, diff, revision-list, create-modal) | 3 |
| WebSocket | Full server with presence + lock + page update broadcasts | Server with presence only |
| Build | Requires PostgreSQL (not verifiable in sandbox) | Same |
| `.safeParse()` | **Yes, everywhere** | No (.parse() used) |

---

## Rubric Scoring

### 1. FUNCTIONALITY (17/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | **9** | All API routes: auth (4), pages CRUD (3), revisions (4 including restore), locks (3), search via pages GET param. WebSocket server with all 4 event types (presence:update, page:updated, lock:acquired, lock:released). UI components: sidebar with page tree, markdown editor with split pane pattern, revision list, revision diff, search, breadcrumbs, lock banner, presence avatars, create page modal. Cascade delete with reparent option. Missing: drag-to-reorder sidebar (complex UX feature). |
| Runtime correctness | 10 | **8** | Cannot fully verify (PostgreSQL required). Code is structurally sound: parameterized SQL, transactions for multi-step ops, lock expiry enforcement with `NOW()`, recursive CTE for depth. REVIEW.md acknowledges authenticated route tests are thin. PLAN.md is incorrectly titled "Task Manager" (cosmetic issue). |

### 2. CODE QUALITY (18/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | **5** | Zero `any` types. Typed interfaces for all entities (`User`, `UserPublic`, `Page`, `PageWithRevision`, `PageRevision`, `PageLock`, `SessionData`, `PresenceUser`, `WsMessage`, `PageTreeNode`). Zod schemas with `z.infer<>` exports. Generic `query<T>` function. |
| Naming & structure | 5 | **5** | Clean kebab-case file names for components. Dedicated `hooks/` directory for `use-websocket` and `use-presence`. `lib/auth.ts` separates bcrypt logic. `lib/slug.ts`, `lib/markdown.ts` well-separated. No god files. |
| Error handling | 5 | **4** | Consistent response envelope via typed helpers (`success`, `error`, `unauthorized`, `notFound`, `validationError`). `.safeParse()` everywhere. Generic auth error "Invalid email or password". BUT: no try/catch in several route handlers (GET pages, GET page by slug, PATCH page) — exceptions would return 500 without controlled error shape. |
| Idiomatic patterns | 5 | **4** | Server components for pages, client components for interactive parts. `useRouter` for navigation. Custom hooks (`useWebSocket`, `usePresence`) properly abstracted. BUT: `cookies()` not awaited in session.ts (Next.js 14+ requires `await cookies()`). Route params not using `Promise<>` wrapper (Next.js 14.2+ pattern). |

### 3. ARCHITECTURE (13/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | **5** | `lib/db.ts` (pool + query), `lib/auth.ts` (bcrypt), `lib/session.ts`, `lib/markdown.ts`, `lib/slug.ts`, `lib/websocket.ts` — each with single responsibility. API routes call lib functions. Components don't access DB. WebSocket logic isolated in `lib/websocket.ts` with exported broadcast functions. |
| API design | 5 | **5** | RESTful with consistent envelope. Lock acquisition uses `ON CONFLICT DO UPDATE WHERE locked_by = $2` (only owner can renew — elegant). Returns 423 Locked when another user holds lock. `LATERAL JOIN` for latest revision. Cascade vs reparent option on delete. Search via query param on pages GET. |
| File organization | 5 | **3** | Tests are in `tests/` directory — NOT colocated with source. `tests/api/auth.test.ts` instead of `src/app/api/auth/register/route.test.ts`. Lib tests are colocated (`src/lib/auth.test.ts`). Mixed approach. `types/index.ts` is a barrel file. |

### 4. TEST QUALITY (9/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | **3** | 72 tests: schemas (16), auth lib (4), markdown (6), slug (6), auth API (9), pages API (10), revisions API (6), locks API (6), wiki-flow component (9). Good coverage of lib + API. BUT: only 1 component test file (wiki-flow). No individual component tests for sidebar, editor, search, etc. Auth route tests limited to 401 checks per REVIEW.md. |
| Test design | 5 | **3** | Lib tests colocated, API tests separated. No factories. No test helpers for authenticated requests. REVIEW.md explains decision to test only unauthenticated paths at route level. No `sealData` or session mocking. |
| Meaningful assertions | 5 | **3** | Schema tests are thorough (16 tests with boundary values). Slug and markdown tests verify actual output. API tests mostly verify 401 for unauthenticated + happy paths where possible. Wiki-flow component test checks rendering. Missing: deep API integration assertions, error code checking, response shape validation. |

### 5. PRODUCTION READINESS (11/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | **4** | iron-session. bcrypt via dedicated `lib/auth.ts`. Zod `.safeParse()`. Parameterized SQL (`$1`, `$2`). Generic auth errors. Lock ownership check. Password not in responses. dompurify for markdown sanitization. BUT: no CSRF on WebSocket. `cookies()` not awaited. Some route handlers missing try/catch. |
| Performance | 5 | **4** | PostgreSQL connection pool (max 20). `LATERAL JOIN` for latest revision (efficient). Lock expiry via `NOW()` comparison. Recursive CTE for depth. Auto-cleanup of expired locks on acquire. |
| DX & maintainability | 5 | **3** | REVIEW.md present with honest self-assessment. `server.ts` for WebSocket integration. Scripts: dev, build, start, test. BUT: no `.env.example`. No README (only PLAN.md which is incorrectly titled). PLAN.md is for wrong project (says "Task Manager"). `react-dom` unused (minor). |

### 6. BONUS / PENALTY (+3)

| Item | Points |
|---|---|
| +3 Lock acquisition with `ON CONFLICT DO UPDATE WHERE locked_by = $2` — elegant, race-condition-safe | +3 |
| +2 `LATERAL JOIN` for latest revision — correct PostgreSQL pattern | +2 |
| +2 WebSocket with all 4 event types + broadcast functions for page update and lock changes | +2 |
| +1 dompurify for markdown sanitization (security-conscious) | +1 |
| +1 Cascade delete with reparent option (configurable via query param) | +1 |
| -2 Tests not colocated (tests/ directory for API tests) | -2 |
| -1 types/index.ts barrel file | -1 |
| -1 PLAN.md incorrectly titled "Task Manager" (cosmetic but sloppy) | -1 |
| -1 No .env.example | -1 |
| **Net** | **+3** |

---

## TOTAL: 71/100

| Category | Max | Score |
|---|---|---|
| Functionality | 20 | 17 |
| Code Quality | 20 | 18 |
| Architecture | 15 | 13 |
| Test Quality | 15 | 9 |
| Production Readiness | 15 | 11 |
| Bonus/Penalty | ±15 | +3 |
| **Total** | **100** | **71** |

---

## Opus vs Kimi on Project 2 (baselines)

| Dimension | Opus (71) | Kimi (37) | Gap |
|---|---|---|---|
| Functionality | 17 | 14 | +3 |
| Code Quality | 18 | 12 | +6 |
| Architecture | 13 | 11 | +2 |
| Test Quality | 9 | 0 | **+9** |
| Production Readiness | 11 | 8 | +3 |
| Bonus/Penalty | +3 | -8 | **+11** |
| **Total** | **71** | **37** | **+34** |

The gap is larger on project-2 (34 points) than project-1 (18 points). Harder projects amplify model differences — Kimi's hygiene issues (console, any, no tests) compound on a bigger codebase, while Opus maintains discipline.

---

## What infra v1 would fix for Opus on project-2

| Issue | Points lost | Infra fix |
|---|---|---|
| Tests not colocated | -2 | tests.md rule: "colocate with source" |
| types/index.ts barrel | -1 | code-hygiene skill: "no barrels" |
| No .env.example | -1 | code-hygiene skill: DX requirements |
| Missing try/catch in some routes | -1 | api-routes.md rule: "always wrap in try/catch" |
| PLAN.md wrong title | -1 | — (model error, infra can't fix) |
| Thin authenticated route tests | -2 | test-writing skill: auth test patterns with sealData |
| No component tests for individual components | -2 | test-writing skill: component test checklist |
| `cookies()` not awaited | -1 | session.ts template shows `await cookies()` |

**Recoverable: ~10 points → target 80-82 with infra v1**

---

## Full Score Comparison

| Run | Project | Model | Infra | Score |
|---|---|---|---|---|
| kimi baseline | 1 (★☆☆) | Kimi | none | 56 |
| **kimi baseline** | **2 (★★☆)** | **Kimi** | **none** | **37** |
| opus baseline | 1 (★☆☆) | Opus | none | 74 |
| **opus baseline** | **2 (★★☆)** | **Opus** | **none** | **71** |
| kimi-skills-v2 | 1 (★☆☆) | Kimi | v1 | 88 |
| opus-skills-v2 | 1 (★☆☆) | Opus | v1 | 89 |
| haiku-skills-v2 | 1 (★☆☆) | Haiku | v1 | 37 |

**Observations:**
- Opus drops only 3 points from P1→P2 (74→71). Model capability scales well to harder projects.
- Kimi drops 19 points from P1→P2 (56→37). Harder projects expose hygiene weaknesses more.
- The infra's biggest value on P2 will be preventing Kimi's hygiene collapse.

# Kimi Skills (v1 infra) — Project 2: Collaborative Notes Wiki

**Model**: kimi-k2.5 (via Ollama)  
**Infra**: v1 (6 skills, 8 templates, 4 rules, lint)  
**Pipeline**: single-agent  
**Date**: 2026-03-31  
**Location**: /app/runs/260331-kimi/ (overwrote baseline — path issue now fixed)

---

## Build Overview

| Metric | Kimi P2 baseline (37) | Kimi P2 skills | Opus P2 baseline (71) |
|---|---|---|---|
| Source files | ~30 | ~55 | ~45 |
| Test files | **0** | **10** | 9 |
| Tests written | 0 | **74** | 72 |
| Console statements | 17 | **0** | 0 |
| `any` types | 5 | **0** | 0 |
| `.safeParse()` | No | **Yes** | Yes |
| Response helpers | No | **Yes** (successResponse/errorResponse) | Yes |
| Factories | No | **Yes** (buildUser, buildPage, buildPageRevision, buildPageLock) | No |
| Test helpers | No | **Yes** (createRequest, createAuthRequest, createSessionCookie, mockDb) | No |
| Components | 3 | **14** (auth, layout, page, ui subdirectories) | 12 |
| WebSocket | Partial | **Full** (unsealData auth, all events, heartbeat) | Full |
| DX files | Missing | **.env.example, README, SELF_REVIEW** | Missing .env.example |
| Env validation | No | **Yes** (Zod + throw) | No |
| Build | Unknown | Unknown (PostgreSQL required) | Unknown |
| Phases completed | Unknown | **5/5** (SELF_REVIEW exists) | Unknown |

---

## What the infra fixed vs baseline

| Baseline issue (37) | Fixed? | Evidence |
|---|---|---|
| Zero tests (-18 total) | **Yes** | 74 tests across 10 files, colocated |
| 17 console.error (-8) | **Yes** | Zero console statements in source |
| 5 `any` types (-5) | **Yes** | Zero `any` — all functions typed, explicit return types |
| `.parse()` not `.safeParse()` (-3) | **Yes** | `.safeParse()` in all route handlers |
| No response envelope (-2) | **Yes** | `successResponse()`/`errorResponse()` consistently |
| No .env.example (-1) | **Yes** | `.env.example` with generation instructions |
| barrel export (-1) | **Yes** | No barrel files |

**Total penalty points recovered: ~38 worth of issues addressed**

---

## Rubric Scoring

### 1. FUNCTIONALITY (15/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | **8** | All core API routes: auth (4), pages CRUD (5 with slug routes), revisions (3 — create, list, get by ID), locks (3 — get, acquire, release), search, WebSocket. Full component set: auth forms, page editor with split pane, page tree, sidebar, table of contents, presence bar, page create modal, UI primitives (Button, Input, Modal, Avatar). Missing: revision restore endpoint (not found in routes), revision diff view (diff imported but not used in components), drag-to-reorder. |
| Runtime correctness | 10 | **7** | Cannot verify (PostgreSQL required). Code structure sound: parameterized SQL, typed db functions, recursive CTE for depth, lock expiry checks. SELF_REVIEW acknowledges test mocking issues. No BUILD_LOG.md present. WebSocket auth uses proper `unsealData` (not the insecure x-user-id header from baseline). |

### 2. CODE QUALITY (18/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | **5** | Zero `any`. Explicit interfaces for User, Page, PageRevision, PageLock. Typed db functions with `Pick<>` for partial returns (getUserById returns without password_hash). `z.infer<>` exports. Factory types match db types. |
| Naming & structure | 5 | **5** | Component subdirectories: auth/, layout/, page/, ui/. Clean separation. Descriptive names (PageCreateModal, PresenceBar, TreeNode). No utils dumping ground. |
| Error handling | 5 | **4** | `successResponse()`/`errorResponse()` used consistently. `.safeParse()` everywhere. Generic auth errors. But: `env.ts` uses throw pattern (good per skill), however some route handlers may not catch all edge cases. No try/catch visible in some test excerpts. |
| Idiomatic patterns | 5 | **4** | Server components for pages, client for interactive parts. Session template followed (getSession + getSessionFromRequest). But: `cookies()` is properly awaited (good!). Custom hook pattern not used for WebSocket on client side. |

### 3. ARCHITECTURE (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | **5** | All SQL in db.ts with 20+ typed functions (createUser, getPageBySlug, getPageDepth, acquireLock, searchPages, etc.). Routes call db functions only. Components are presentation. Markdown rendering isolated in lib/markdown.ts. |
| API design | 5 | **5** | RESTful, consistent envelope. Parameterized SQL throughout. Recursive CTE for depth. Lock expiry enforcement. Search with ILIKE. Proper slugification with uniqueness helper. |
| File organization | 5 | **4** | Tests colocated for routes (good!). Factories in src/test/ (not tests/). Component subdirectories well-organized (auth/, layout/, page/, ui/). But: some test files may not have corresponding source files for components. |

### 4. TEST QUALITY (10/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | **4** | 74 tests: validators (20), api-response (4), auth routes (16), pages routes (17), lock routes (11), revisions routes (6). Good API coverage. But: zero component tests. SELF_REVIEW acknowledges this gap. |
| Test design | 5 | **3** | Factories created with buildUser, buildPage, buildPageRevision, buildPageLock, plus API input builders. Test helpers with createRequest, createAuthRequest (uses sealData!), mockDb. But: tests mock the db module heavily (vi.mock('@/lib/db')) — not integration tests. SELF_REVIEW notes "test mocking issues." |
| Meaningful assertions | 5 | **3** | Assert on status codes, json.success, error codes. Check password_hash not in response. But: mocked db means assertions verify mock wiring, not actual behavior. Factory builders exist but test assertions are mostly on mock return values. |

### 5. PRODUCTION READINESS (12/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | **5** | iron-session with proper env-validated secret. bcrypt. Zod `.safeParse()`. All SQL parameterized. WebSocket auth uses `unsealData` (proper cryptographic verification, not x-user-id header). Lock ownership checks. Generic auth errors. Env validated at startup with throw (follows skill). DOMPurify for markdown sanitization. |
| Performance | 5 | **4** | PostgreSQL connection pool. Indexes on email, slug, parent, created_by, revisions page_id, lock expiry. Recursive CTE for depth. ILIKE search (could use tsvector for better perf, but works). |
| DX & maintainability | 5 | **3** | .env.example present. README present. SELF_REVIEW present. Scripts: dev, build, start, test, db:init. But: no BUILD_LOG.md (skill required this). Unused deps: diff, react-dom, tailwindcss, ws (4 deps). |

### 6. BONUS / PENALTY (+1)

| Item | Points |
|---|---|
| +2 Comprehensive factories (buildUser, buildPage, buildPageRevision, buildPageLock, plus 5 API input builders) | +2 |
| +2 Test helpers with real sealData auth cookies (createAuthRequest) | +2 |
| +1 Env validation with throw (followed the improved skill) | +1 |
| +1 WebSocket auth uses unsealData (proper crypto, huge improvement over baseline) | +1 |
| +1 DOMPurify for markdown sanitization | +1 |
| -2 4 unused dependencies (diff, react-dom, tailwindcss, ws) | -2 |
| -1 No BUILD_LOG.md (required by build prompt) | -1 |
| -1 Missing revision restore endpoint | -1 |
| -1 Tests mock db heavily — unit tests not integration tests | -1 |
| -1 Zero component tests | -1 |
| **Net** | **+1** |

---

## TOTAL: 70/100

| Category | Max | Kimi P2 baseline (37) | Kimi P2 skills (70) | Opus P2 baseline (71) |
|---|---|---|---|---|
| Functionality | 20 | 14 | 15 | 17 |
| Code Quality | 20 | 12 | **18** | 18 |
| Architecture | 15 | 11 | **14** | 13 |
| Test Quality | 15 | 0 | **10** | 9 |
| Production Readiness | 15 | 8 | **12** | 11 |
| Bonus/Penalty | ±15 | -8 | **+1** | +3 |
| **Total** | **100** | **37** | **70** | **71** |

---

## Key Takeaways

### 1. Infra lifted Kimi from 37 → 70 on project-2 (+33 points)

Almost the same lift as project-1 (56 → 88 = +32). The infrastructure generalizes across project difficulty levels. The project-1-flavored templates adapted well to PostgreSQL/multi-user context — Kimi followed the patterns (response helpers, session template, safeParse) even though the specific SQL syntax changed from SQLite to PostgreSQL.

### 2. Kimi now matches Opus baseline on project-2

Kimi with infra (70) ≈ Opus without infra (71). The 1-point gap is remarkable given the 34-point gap at baseline. Infrastructure essentially erases the model capability difference.

### 3. Tests went from 0 → 74, but they're mock-heavy

The testing skills worked — Kimi wrote 74 tests across 10 files. But they mock the database module instead of using integration tests. This is a weaker testing approach (verifies mock wiring, not real behavior). The factories are excellent though — 8 builder functions with proper typing.

### 4. Security improved dramatically

- Baseline: forgeable x-user-id WebSocket auth
- With skills: proper `unsealData` crypto verification
- Baseline: `.parse()` leaking Zod errors
- With skills: `.safeParse()` everywhere
- Added: DOMPurify for markdown, env validation at startup

### 5. Unused deps remain a recurring issue

4 unused deps (diff, react-dom, tailwindcss, ws). The dep audit skill helped for project-1 but Kimi still over-installs for project-2. The deps are likely from the PLAN phase (planning to use diff for revision comparison) but never imported.

---

## Score Trajectory

```
Project 1 (★☆☆)              Project 2 (★★☆)
─────────────                 ─────────────
kimi baseline    56           kimi baseline    37
kimi-skills-v2   88 (+32)     kimi-skills      70 (+33)
opus baseline    74           opus baseline    71
opus-skills-v2   89 (+15)     opus-skills       ? (target: 80-82)
```

The infra lift is consistent: **+32 on P1, +33 on P2**. The infrastructure is project-agnostic — it works on harder projects too.

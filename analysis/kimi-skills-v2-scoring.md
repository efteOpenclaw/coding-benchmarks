# kimi-skills-v2 Scoring — Project 1: Task Manager

**Model**: kimi-k2.5 (via Ollama)  
**Infra**: v1 (6 skills, 8 templates, 4 rules, lint)  
**Pipeline**: single-agent  
**Date**: 2026-03-31

---

## Build Overview

| Metric | v1 (kimi-skills) | v2 (kimi-skills-v2) | Delta |
|---|---|---|---|
| Files created | 39 | 51 | +12 |
| Tests passing | 137 | 141 | +4 |
| Test files | 13 | 15 | +2 (ConfirmDialog, EmptyState) |
| Phases completed | 5/5 | 5/5 | Same |
| Build | Success | Success | Same |
| TypeScript errors | 0 | 0 | Same |
| Lint check | 2 failures | **0 failures** | Fixed |

---

## Rubric Scoring

### 1. FUNCTIONALITY (18/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | **9** | All 9 API routes. Auth (register/login/logout/me), task CRUD, filtering by status+priority, sorting by due_date/created_at/priority, priority colors, overdue highlights, delete confirmation, empty states. Added ConfirmDialog and EmptyState components (not in v1). |
| Runtime correctness | 10 | **9** | 141 tests passing. `next build` with standalone output succeeds. All routes return correct status codes. |

### 2. CODE QUALITY (20/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | **5** | Strict mode. Zero `any`. Typed `UserRow`, `TaskRow`, `TaskQueryOptions` interfaces. `z.infer<>` exports. Typed `Partial<Omit<TaskRow, ...>>` on updateTask. |
| Naming & structure | 5 | **5** | Clean file names. No utils.ts. No god components. `EmptyState` and `ConfirmDialog` properly extracted as separate components. |
| Error handling | 5 | **5** | All routes use `successResponse()`/`errorResponse()` consistently — including catch blocks. **No manual `Response.json` construction anywhere.** Zero console statements. Logout route now uses `errorResponse()` (was manual in v1). |
| Idiomatic patterns | 5 | **5** | Server component shell (`tasks/page.tsx`) + client child (`TasksClient.tsx`). App Router used correctly. `'use client'` only on interactive components. `export default` only on pages/layouts/error boundaries. |

### 3. ARCHITECTURE (15/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | **5** | All SQL in `db.ts`. Routes are pure glue. Components are presentation only. `api-response.ts` provides typed envelope. |
| API design | 5 | **5** | RESTful. Consistent `{success, data, error}` envelope. 201 for create, 404 for wrong user (not 403), 409 for conflict. |
| File organization | 5 | **5** | Tests colocated. No `__tests__/`. No barrel exports. Clean grouping by concern. |

### 4. TEST QUALITY (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | **5** | 141 tests: validators (33), DB (25), API routes (44 across 6 files), components (39 across 7 files including ConfirmDialog + EmptyState). Every route has auth + validation + happy path + error tests. |
| Test design | 5 | **5** | In-memory SQLite `getDb(':memory:')` + `closeDb()`. API tests use real `iron-session` `sealData` for auth cookies (not mocking!). Every test has assertions (8+ expect calls per component test file). Proper beforeEach/afterEach. |
| Meaningful assertions | 5 | **4** | Strong: asserts `res.status`, `json.success`, `json.error.code`, `json.data.user` shapes, `not.toHaveProperty("password_hash")`. Uses `expect.objectContaining`. Minor: factories.ts exists but tests still use raw `createUser("email", hash)` instead of factories — infrastructure created but not leveraged. |

### 5. PRODUCTION READINESS (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | **5** | iron-session (encrypted cookies). bcrypt(10). Zod on all inputs with `.safeParse()`. All SQL parameterized. `UPDATABLE_TASK_COLUMNS` whitelist on update. `allowedSortColumns` whitelist on sort. 404 for wrong-user resources. Generic "Invalid email or password" messages. No password_hash in responses (destructured out). |
| Performance | 5 | **4** | WAL mode. Foreign keys. Indexes on user_id, status, priority, due_date, created_at. No N+1. `CHECK` constraints on status/priority/title length at DB level. |
| DX & maintainability | 5 | **5** | `.env.example` with generation instructions. README with setup, scripts table, architecture overview, API docs. Scripts: dev, build, start, test, test:watch, lint. |

### 6. BONUS / PENALTY (+3)

| Item | Points |
|---|---|
| +2 Column whitelisting on both UPDATE SET and ORDER BY with custom sort logic (priority → CASE expression, due_date → nulls last) | +2 |
| +2 Real iron-session cookies in API tests via `sealData` — not mocking, actually testing the full auth flow | +2 |
| +1 ConfirmDialog + EmptyState as separate components (spec didn't require componentization) | +1 |
| -1 Factories.ts created but never imported in test files — tests use raw data instead | -1 |
| -1 `react-dom` flagged as unused (required by Next.js, borderline false positive) | -0 (waived — Next.js implicit dependency) |
| **Net** | **+4** |

---

## TOTAL: 88/100

| Category | Max | v1 (81) | v2 (88) | Delta |
|---|---|---|---|---|
| Functionality | 20 | 18 | 18 | 0 |
| Code Quality | 20 | 19 | **20** | +1 |
| Architecture | 15 | 15 | 15 | 0 |
| Test Quality | 15 | 13 | **14** | +1 |
| Production Readiness | 15 | 14 | 14 | 0 |
| Bonus/Penalty | ±15 | +2 | **+4** | +2 |
| **Total** | **100** | **81** | **88** | **+7** |

---

## What the v2 improvements fixed

| v1 issue | Points lost in v1 | Fixed in v2? | How |
|---|---|---|---|
| console.error in env.ts | -1 | **Yes** | No env.ts at all — session.ts uses fallback string (matching template) |
| Unused deps: supertest + clsx | -2 | **Yes** | Neither installed. Clean dep list: 7 prod, 11 dev |
| Empty test assertion (TaskItem overdue) | -1 | **Yes** | All test files have 5-33 expect calls. Zero empty tests. |
| Logout route manual response | -1 | **Yes** | All routes use `errorResponse()`/`successResponse()` consistently |
| Factories not imported | 0 (new) | **No** | factories.ts exists but tests still use raw `createUser()` directly |

## What v2 added that v1 didn't have

| New in v2 | Points gained |
|---|---|
| ConfirmDialog as separate component with tests | +1 (bonus) |
| EmptyState as separate component with tests | included above |
| Real iron-session cookies in API tests (sealData) | +2 (bonus — v1 mocked session) |
| Consistent response helper usage in ALL routes | +1 (error handling 4→5) |
| `CHECK` constraints at DB level for status/priority/title | quality improvement |
| Proper sort logic: priority CASE expression, due_date nulls last | already in v1 |

---

## Remaining issues (12 points to perfect)

| Issue | Points lost | Difficulty to fix |
|---|---|---|
| Minor a11y polish (no axe checks in component tests) | -1 | Easy — add vitest-axe |
| Factories created but not used | -1 | Easy — import factories in tests |
| No `noUncheckedIndexedAccess` in tsconfig | -0 | Nit — not penalized |
| Session fallback string in dev | -0 | Acceptable for dev, noted in review |
| No rate limiting | -0 | Out of spec scope |
| Spec compliance gap (could be 10/10) | -1 | Need keyboard nav, screen reader testing |
| Runtime correctness gap | -1 | Minor — could add E2E validation |
| Performance — could add connection pooling | -1 | SQLite is single-writer, diminishing returns |
| Test assertions could be deeper on some component tests | -1 | More `toEqual` on full shapes |
| Some components share interface definitions instead of importing | -0 | Nit |

---

## Comparison Chain

| Run | Model | Infra | Score | Delta from previous |
|---|---|---|---|---|
| 260331-opus | Opus | none | 74 | — |
| 260331-kimi | Kimi | none | 56 | — |
| 260331-kimi-skills | Kimi | 4 skills | 81 | +25 from baseline |
| **260331-kimi-skills-v2** | **Kimi** | **6 skills + templates + rules + lint** | **88** | **+7 from v1, +32 from baseline** |

## Key takeaways

1. **Skills work.** Kimi went from 56 → 81 → 88 with progressively better skills. That's +32 points from the same model with the same spec.

2. **The specific v2 improvements landed.** Every targeted fix (console, unused deps, empty tests, response helpers) was addressed. The skill changes directly caused the score improvement.

3. **Kimi now significantly outperforms Opus baseline** (88 vs 74). The infrastructure compensates for model capability differences.

4. **Templates drove pattern consistency.** v2 uses `successResponse()`/`errorResponse()` everywhere, matches the session.ts template exactly, and follows the db.ts whitelist pattern. Zero drift.

5. **Real auth cookies in tests** (via `sealData`) is a major quality jump. v1 mocked the session module. v2 tests the actual iron-session flow end-to-end. This catches more real bugs.

6. **Factories remain the stubborn gap.** Both v1 and v2 created factories.ts but never imported it. The skill says "mandatory" but the model still takes the path of least resistance. This may need a template-level fix (test template that imports from factories).

7. **Diminishing returns are visible.** v1→v2 gained 7 points (vs v0→v1 gaining 25). The remaining 12 points are harder: a11y, deeper assertions, E2E-level validation. The sub-agent pipeline may be needed to push past 90.

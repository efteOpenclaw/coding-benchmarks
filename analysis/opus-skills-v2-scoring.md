# opus-skills-v2 Scoring — Project 1: Task Manager

**Model**: Opus  
**Infra**: v1 (6 skills, 8 templates, 4 rules, lint)  
**Pipeline**: single-agent  
**Date**: 2026-03-31

---

## Build Overview

| Metric | Opus baseline (74) | opus-skills-v2 |
|---|---|---|
| Files created | ~30 | 38 source + 15 test + config |
| Tests passing | 67 | **160** |
| Test files | ~10 | 13 |
| Component tests | 8 tests | 41 tests across 5 files |
| Lint check | N/A | **All 6 passed** |
| Factories used | No | **Yes — 7 test files** |
| Build | Success | Success (standalone) |

---

## Rubric Scoring

### 1. FUNCTIONALITY (18/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | **9** | All 9 API routes. Auth CRUD, task CRUD, filtering, sorting, priority colors, overdue highlights, delete confirmation, empty states. Good a11y: `aria-label` on edit/delete/status, `role="alert"` on errors, `autoComplete` attributes, `sr-only` labels. |
| Runtime correctness | 10 | **9** | 160 tests passing. `next build` succeeds with standalone output. All flows complete. |

### 2. CODE QUALITY (20/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | **5** | Strict mode. Zero `any`. Typed `UserRow`, `TaskRow`, `CreateTaskParams`, `TaskQueryParams`. `z.infer<>` exports. `Partial<>` on updateTask params. |
| Naming & structure | 5 | **5** | Clean names. ConfirmDialog properly extracted. No utils.ts. No god components. `TasksPageClient` at ~170 lines (borderline but well-structured). |
| Error handling | 5 | **5** | `successResponse()`/`errorResponse()` used consistently in ALL routes including catch blocks and logout. Zero console statements. Generic "Invalid email or password" for both wrong-email and wrong-password. |
| Idiomatic patterns | 5 | **5** | Server shell (`tasks/page.tsx` with auth guard) + client child (`TasksPageClient`). `'use client'` only on interactive components. App Router used correctly. `export default` only on pages/layouts/error. |

### 3. ARCHITECTURE (15/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | **5** | All SQL in `db.ts`. Routes are pure glue (auth → validate → operate → respond). Components are presentation only. |
| API design | 5 | **5** | RESTful. Consistent `{success, data, error}` envelope via typed helpers. 201 for create, 404 for wrong user (not 403), 409 for conflict. Session cookies set via `getSetCookieHeader()`. |
| File organization | 5 | **5** | Tests colocated. No `__tests__/`. No barrel exports. Clean grouping. |

### 4. TEST QUALITY (15/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | **5** | 160 tests: validators (40 with `it.each`), DB (28 including sort order + FK enforcement), API routes (50 across 6 files), components (42 across 5 files). Every route has auth + validation + happy path + error tests. |
| Test design | 5 | **5** | **Factories properly used** in all 7 API/DB test files (`createUserInDb`, `createTaskInDb`). In-memory SQLite. Real `sealData` cookies for auth (not mocking). Proper `beforeEach`/`afterEach`. `it.each` for boundary values. |
| Meaningful assertions | 5 | **5** | Asserts `res.status`, `json.success`, `json.error.code`, `json.data.user` shapes, `not.toHaveProperty("password_hash")`. Login test verifies **error messages don't reveal email existence** (same message for wrong-email and wrong-password). Cookie assertions on register/login. Overdue test has real assertion. |

### 5. PRODUCTION READINESS (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | **5** | iron-session (encrypted cookies). `hashSync` with cost 10. Zod `.safeParse()` on all inputs. All SQL parameterized. `UPDATABLE_COLUMNS` Set whitelist. `SORT_MAP` Record whitelist with CASE expression for priority. 404 for wrong-user resources. Generic auth errors. Password capped at 128 chars. Email max 255. Due date regex `YYYY-MM-DD`. `getSetCookieHeader` for proper cookie propagation. |
| Performance | 5 | **4** | WAL mode. Foreign keys. Indexes on user_id, status, priority, due_date. CHECK constraints at DB level. No N+1. `hashSync` is synchronous (blocks event loop) but acceptable for single-user scope. |
| DX & maintainability | 5 | **5** | `.env.example` with generation instructions. README with setup, scripts table, architecture overview, API endpoint list. Scripts: dev, build, start, test, test:watch, typecheck. |

### 6. BONUS / PENALTY (+7)

| Item | Points |
|---|---|
| +2 Factories properly used across 7 test files (both Kimi runs missed this) | +2 |
| +2 Login test verifies error messages don't reveal email existence (sophisticated security insight, spec didn't require this) | +2 |
| +1 Due date regex validation + password max 128 + email max 255 (input hardening beyond spec) | +1 |
| +1 Real sealData cookies with set-cookie header assertions on register/login | +1 |
| +1 Thoughtful empty states (different message for "no tasks" vs "no tasks match filters") | +1 |
| -0 react-dom flagged unused (Next.js peer dep, waived) | -0 |
| **Net** | **+7** |

---

## TOTAL: 89/100

| Category | Max | Opus baseline | opus-skills-v2 | Delta |
|---|---|---|---|---|
| Functionality | 20 | 18 | 18 | 0 |
| Code Quality | 20 | 19 | **20** | +1 |
| Architecture | 15 | 15 | 15 | 0 |
| Test Quality | 15 | 13 | **15** | +2 |
| Production Readiness | 15 | 9 | **14** | +5 |
| Bonus/Penalty | ±15 | +0 | **+7** | +7 |
| **Total** | **100** | **74** | **89** | **+15** |

---

## What the infra fixed (vs Opus baseline at 74)

| Baseline issue | Points lost | Fixed? | How |
|---|---|---|---|
| SQL injection in updateTask field interpolation | -5 | **Yes** | `db-query.ts` template → `UPDATABLE_COLUMNS` Set whitelist |
| Missing .env.example | -2 | **Yes** | Build prompt Phase 5 requirement + code-hygiene skill |
| Missing README | -1 | **Yes** | Build prompt Phase 3 requirement |
| Hardcoded session secret | -1 | **Partial** | Template shows fallback pattern (acceptable for dev) |
| Test coverage (67 → 160 tests) | -2 | **Yes** | Split testing skills + test templates + factory template |
| Idiomatic patterns gap | -1 | **Yes** | Architecture skill + server/client template |

## What Opus did that Kimi didn't

| Improvement | Opus v2 | Kimi v2 |
|---|---|---|
| Factories actually used in tests | **Yes** (7 files import from factories) | No (created but never imported) |
| Login error message parity test | **Yes** (verifies same message for wrong-email/wrong-password) | No |
| Cookie header assertions | **Yes** (verifies set-cookie contains session name) | No |
| Due date format validation | **Yes** (regex `YYYY-MM-DD`) | Accepts any string |
| Input length caps | **Yes** (password 128, email 255, description 5000) | Partial |
| `getSetCookieHeader` helper | **Yes** (proper cookie propagation in route handlers) | No (Kimi's approach differed) |

## What both models did well with infra v1

| Pattern | Both models followed it |
|---|---|
| `successResponse()`/`errorResponse()` consistently | Yes — zero manual `Response.json` |
| `UPDATABLE_COLUMNS` whitelist for UPDATE | Yes |
| `SORT_MAP` whitelist for ORDER BY | Yes |
| iron-session with encrypted cookies | Yes |
| Zod `.safeParse()` (not `.parse()`) | Yes |
| Colocated tests | Yes |
| Zero console, zero `any` | Yes |
| .env.example + README | Yes |
| Server shell + client child pattern | Yes |

---

## Full Comparison Chain

| Run | Model | Infra | Score | Delta from baseline |
|---|---|---|---|---|
| 260331-kimi | Kimi | none | 56 | — |
| 260331-opus | Opus | none | 74 | — |
| 260331-kimi-skills | Kimi | 4 skills | 81 | +25 |
| 260331-kimi-skills-v2 | Kimi | v1 (6 skills + templates + rules + lint) | 88 | +32 |
| **260331-opus-skills-v2** | **Opus** | **v1 (6 skills + templates + rules + lint)** | **89** | **+15** |

## Key takeaways

1. **Infra narrows the gap.** Without infra: Opus 74, Kimi 56 (18-point gap). With infra v1: Opus 89, Kimi 88 (1-point gap). The infrastructure compensates for model capability differences.

2. **Opus picked up factories.** The updated test template that imports from factories worked — Opus followed it in all 7 API/DB test files. Both Kimi runs ignored the "use factories" instruction. This validates the approach of embedding patterns in templates rather than just describing them in skills.

3. **Opus brought security insights.** The login error message parity test and cookie header assertions are things the skills didn't explicitly ask for. Opus applied security thinking beyond the checklist. This is where stronger model capability shows — not in following templates (both models do that) but in generating novel insights.

4. **Production readiness is the biggest improvement.** Opus went from 9/15 to 14/15 — a 5-point jump driven entirely by the SQL injection fix (+5 penalty removed) and DX files (.env.example + README).

5. **Diminishing returns are clear.** Opus baseline → infra v1 gained 15 points. Kimi baseline → infra v1 gained 32 points. Weaker models benefit more from infrastructure. The remaining ~10 points to 100 are in a11y testing, E2E coverage, and deeper edge cases — diminishing returns territory.

6. **Both models plateau near 90.** Kimi at 88, Opus at 89. The sub-agent pipeline or adversarial testing approach may be needed to push past this ceiling.

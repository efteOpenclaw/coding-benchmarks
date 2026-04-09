# Haiku Skills-v2 Scoring — Project 1: Task Manager

**Model**: Haiku 4.5  
**Infra**: v1 (6 skills, 8 templates, 4 rules, lint)  
**Pipeline**: single-agent  
**Date**: 2026-03-31  
**Baseline**: No haiku-baseline run (workspace was empty — Haiku may not have been invoked for baseline)

---

## Build Overview

| Metric | Haiku skills-v2 | Kimi v2 (88) | Opus v2 (89) |
|---|---|---|---|
| Build complete | **No** — missing pages, layout, CSS, next.config, README | Yes | Yes |
| Source files | ~20 (lib + routes + components, no pages) | 51 | 53 |
| Test files | 11 | 15 | 13 |
| Tests written | ~126 | 141 | 160 |
| Tests passing | ~64 (per BUILD_LOG, 53 still failing) | 141 | 160 |
| Lint check | 1 failure (4 `any` types) | All passed | All passed |
| `next build` | **Cannot succeed** (no layout.tsx, no pages) | Success | Success |
| Phases completed | 3 of 5 (stalled mid-Phase 3) | 5/5 | 5/5 |

**The build is incomplete.** Haiku got through planning, test writing, and partial implementation (lib + API routes + components) but never created pages, layout, CSS, next.config, or the DX files. It stalled during Phase 3 with 53 tests still failing and never reached Phase 4 (validate) or Phase 5 (self-review).

---

## Rubric Scoring

### 1. FUNCTIONALITY (6/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | **4** | All 9 API routes implemented with correct methods. Validators cover all inputs. DB layer complete with all operations. BUT: no pages (login, register, tasks), no layout, no globals.css — the app has no UI at all. API-only, not a fullstack app. Missing: responsive design, priority colors, overdue highlights, empty states, delete confirmation dialog. Components exist but aren't wired into pages. |
| Runtime correctness | 10 | **2** | Cannot run — no next.config, no layout.tsx, no page files. `next build` would fail. 64 of ~126 tests passing (51% pass rate). Session handling issues noted in BUILD_LOG. |

### 2. CODE QUALITY (14/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | **3** | Strict mode in tsconfig. Good typed interfaces for `UserRow`, `Task` in db.ts. z.infer not exported. BUT: **4 `any` types** in component props — `AuthForm({ ... }: any)`, `FilterBar({ ... }: any)`, `TaskList({ ... }: any)`, `TaskForm({ ... }: any)`. Haiku took a shortcut on props typing. |
| Naming & structure | 5 | **4** | Clean file names. Functions named well. No utils.ts. No barrel exports. Components properly named. Minor: `getTaskByIdForUser` is verbose but descriptive. |
| Error handling | 5 | **4** | All routes use `success()`/`error()` response helpers consistently (even catch blocks). Zero console statements. `.safeParse()` used correctly throughout. API response helpers return `new Response()` instead of `NextResponse.json()` — functional but less idiomatic. |
| Idiomatic patterns | 5 | **3** | API routes follow the template pattern well. Session setup matches template exactly. BUT: no pages exist so no server/client component split. Components use `any` props instead of typed interfaces. api-response.ts uses raw `Response` constructor instead of `NextResponse.json`. |

### 3. ARCHITECTURE (11/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | **5** | All SQL in db.ts with typed wrapper functions. Routes are pure glue. Components are presentation only. api-response.ts provides envelope. Clean three-layer separation. |
| API design | 5 | **4** | RESTful. Consistent `{success, data, error}` envelope via helpers. 201 for create, 404 for wrong user, 409 for conflict. `.safeParse()` everywhere. BUT: `[id]` route uses URL regex parsing (`getIdFromRequest`) instead of Next.js route params — works but fragile and non-idiomatic. |
| File organization | 5 | **2** | Tests colocated for routes and components (good). BUT: no pages directory at all — major structural gap. No error boundaries, no layout, no globals.css. The app directory is incomplete. |

### 4. TEST QUALITY (8/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | **3** | ~126 tests across 11 files covering validators (30), auth routes (21), task routes (25), components (50). Good breadth of categories: auth, validation, happy path, 404, conflict. BUT: only 64 passing (51% pass rate). 53 tests fail due to session handling and missing integration. |
| Test design | 5 | **3** | Factories created AND partially imported (2 test files use `buildUser`/`buildTask`). In-memory SQLite setup. Proper `beforeEach`/`afterEach` pattern. BUT: tests don't use `sealData` for real auth cookies. Session mocking appears incomplete — source of the 53 failures. |
| Meaningful assertions | 5 | **2** | Assertions exist for status codes, response shapes, `not.toHaveProperty("password_hash")`. BUT: many assertions are in failing tests, so they don't validate anything. The passing tests have decent assertions (validators are solid). |

### 5. PRODUCTION READINESS (5/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | **3** | iron-session (correct). bcrypt with cost 10. Zod `.safeParse()`. All SQL parameterized. `UPDATABLE_TASK_COLUMNS` whitelist. 404 for wrong-user resources. BUT: no error boundaries, session destroy without save in logout. |
| Performance | 5 | **2** | WAL mode. Foreign keys. Indexes on key columns. CHECK constraints. BUT: `sortMap` doesn't handle priority with CASE expression (just sorts alphabetically). No `next.config` means no build optimization. |
| DX & maintainability | 5 | **0** | `.env.example` exists (good). BUT: no README, no next.config, no tailwind.config, no postcss.config, no globals.css. Cannot build or run. 7 unused dependencies. Missing `npm run lint` script. |

### 6. BONUS / PENALTY (-7)

| Item | Points |
|---|---|
| +1 Factories imported in 2 test files (partial factory adoption) | +1 |
| +1 Zero console statements in production code | +1 |
| +1 Comprehensive PLAN.md (well-structured, all sections) | +1 |
| -3 4 `any` types in component props | -3 |
| -3 7 unused dependencies (supertest, autoprefixer, postcss, tailwindcss, etc.) | -3 |
| -3 Build incomplete — no pages, layout, CSS, next.config | -3 |
| -1 `[id]` route uses URL regex instead of route params | -1 |
| **Net** | **-7** |

---

## TOTAL: 37/100

| Category | Max | Score |
|---|---|---|
| Functionality | 20 | 6 |
| Code Quality | 20 | 14 |
| Architecture | 15 | 11 |
| Test Quality | 15 | 8 |
| Production Readiness | 15 | 5 |
| Bonus/Penalty | ±15 | -7 |
| **Total** | **100** | **37** |

---

## What Haiku Did Well

Despite the incomplete build, there are real positives:

1. **Followed templates for lib layer.** `db.ts` closely matches the `db-query.ts` template: singleton, WAL mode, foreign keys, `UPDATABLE_TASK_COLUMNS` whitelist, `crypto.randomUUID()`, typed interfaces.

2. **Session matches template exactly.** `getSession()` + `getSessionFromRequest()` with the same cookie-parsing pattern from `session.ts` template.

3. **API routes follow the pattern.** Auth check → validate (safeParse) → operate → respond via helpers. All routes use `success()`/`error()` consistently.

4. **Zero console statements.** The code-hygiene skill worked — Haiku didn't add a single `console.error` anywhere.

5. **Tests have good structure.** The test files that exist follow the template pattern, use `describe`/`it` blocks, assert on status codes and response shapes.

6. **Excellent PLAN.md.** 350+ lines with file tree, data model, API surface, component tree, dependencies, edge cases, decisions. The architecture skill produced a great plan.

## Where Haiku Failed

1. **Couldn't finish the build.** Stalled in Phase 3 with 53 failing tests and incomplete implementation. Pages, layout, CSS, and config never created. This is likely a context/capability limit — Haiku ran out of steam.

2. **`any` props on all components.** Instead of typing component props, Haiku took the shortcut `}: any)` on all 4 components. The skill says "zero any" but Haiku couldn't manage proper Props interfaces.

3. **Session integration incomplete.** The 53 failing tests are mostly due to session handling — tests call routes directly but session persistence doesn't work without proper cookie flow. Haiku didn't implement `sealData`-based test auth.

4. **`[id]` route params workaround.** Instead of using Next.js `{ params }` convention, Haiku parsed the URL with regex. This suggests unfamiliarity with the App Router's dynamic route API.

---

## Cross-Model Comparison with Infra v1

| | Haiku v2 | Kimi v2 | Opus v2 |
|---|---|---|---|
| **Score** | **37** | **88** | **89** |
| Build complete | No | Yes | Yes |
| Tests passing | 64/126 | 141/141 | 160/160 |
| `any` types | 4 | 0 | 0 |
| Console statements | 0 | 0 | 0 |
| Factories used | Partial (2 files) | No | Yes (7 files) |
| Response helpers | Yes | Yes | Yes |
| Column whitelist | Yes | Yes | Yes |
| `.safeParse()` | Yes | Yes | Yes |
| iron-session | Yes | Yes | Yes |
| .env.example | Yes | Yes | Yes |
| README | No | Yes | Yes |
| Pages/UI | No | Yes | Yes |

## Key Takeaway

**There is a capability floor.** Haiku followed the templates for the lib/API layer — zero console, safeParse, response helpers, column whitelists. The infra clearly guided it. But it couldn't complete the full build: no pages, 53 failing tests, `any` props on components.

The infra helps Haiku produce *better partial output* but can't compensate for insufficient capability to finish a fullstack app. For project-1 difficulty (★☆☆), the minimum viable model is somewhere between Haiku and Kimi.

**Infra lift by model tier:**
| Model | Without infra | With infra v1 | Lift |
|---|---|---|---|
| Opus | 74 | 89 | +15 |
| Kimi | 56 | 88 | +32 |
| Haiku | ~25 (estimated) | 37 | ~+12 |

The weaker the model, the less the infra can lift it — but even for Haiku, the parts it did complete (lib, routes) are significantly cleaner than they would have been without guidance.

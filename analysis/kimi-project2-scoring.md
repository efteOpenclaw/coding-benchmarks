# Kimi Baseline — Project 2: Collaborative Notes Wiki

**Model**: kimi-k2.5 (via Ollama)  
**Infra**: none (baseline)  
**Pipeline**: single-agent  
**Date**: 2026-03-31

---

## Build Overview

| Metric | Value |
|---|---|
| Source files | ~30 |
| Test files | **0** (only test/setup.ts exists, no actual tests) |
| Tests passing | **0** |
| Build | Unknown (PostgreSQL required, not available in sandbox) |
| TypeScript errors | Unknown (no tsc output) |
| WebSocket | Custom server.ts with ws package (implemented) |
| Search | PostgreSQL full-text search with ILIKE fallback |

This is a baseline run — no skills, no templates, no lint. Project-2 (★★☆) is significantly harder than Project-1: multi-user, PostgreSQL, WebSocket presence, revision history, page hierarchy with depth limits, edit locking, markdown rendering, full-text search.

---

## Rubric Scoring

### 1. FUNCTIONALITY (14/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | **7** | All core API routes present: auth (4), pages CRUD (3 + slug routes), revisions (4), locks (3), search (1). WebSocket server.ts with presence events. Missing: drag-to-reorder sidebar, proper breadcrumb nav, revision diff view (only individual revision view, no side-by-side diff). Components exist but are sparse (Header, PageTree, PresenceIndicator only — no dedicated editor, revision diff, or lock indicator components). |
| Runtime correctness | 10 | **7** | Cannot fully verify — requires PostgreSQL. Code structure is correct: proper SQL with parameterized queries, transaction support, recursive CTE for depth checking. However: WebSocket auth uses `x-user-id` header fallback (insecure in production), lock expiry not enforced server-side on check. |

### 2. CODE QUALITY (12/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | **3** | Types defined in `types/index.ts`. However: 5 explicit `any` types (`lib/db.ts` params, `server.ts` client map, `types/index.ts` WebSocket payload, `broadcast` message). `query<T = any>` in db.ts. |
| Naming & structure | 5 | **4** | Clean file naming. Route groups `(app)` and `(auth)` well-used. But: `types/index.ts` is a barrel file. Some components use `export default` (Header, PageTree). |
| Error handling | 5 | **2** | **17 `console.error` statements** across all API routes and pages. Uses `.parse()` instead of `.safeParse()` — Zod throws on invalid input, catch block returns generic error. No consistent response shape (`{ error: string }` in some routes, raw Zod errors could leak). |
| Idiomatic patterns | 5 | **3** | Route groups correctly used. Server components for pages. But: `requireAuth()` throws instead of returning a response (anti-pattern for route handlers). No `'use client'` boundary discipline — some pages fetch in effects instead of using server components. |

### 3. ARCHITECTURE (11/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | **4** | SQL mostly in route handlers (not a separate db layer with typed functions). `lib/db.ts` is just a pool wrapper + transaction helper — no domain-specific query functions. Routes contain raw SQL. Better: `lib/markdown.ts` and `lib/slug.ts` are well-separated. |
| API design | 5 | **4** | RESTful routes match spec well. Proper use of slugs. Recursive CTE for depth checking is good. But: no consistent response envelope (some routes return raw arrays, some return `{ error }` objects). GET /api/pages doesn't require auth (spec says all routes protected). |
| File organization | 5 | **3** | Route groups are good. But: `types/index.ts` barrel export, test setup exists but no actual tests, scripts/ directory is a nice touch (seed, setup-db). No colocated tests. |

### 4. TEST QUALITY (0/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | **0** | Zero test files. Only `test/setup.ts` exists (jest-dom import + cleanup). |
| Test design | 5 | **0** | N/A |
| Meaningful assertions | 5 | **0** | N/A |

### 5. PRODUCTION READINESS (8/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | **3** | iron-session for auth (correct). bcrypt with cost 10. Zod validation on inputs. Parameterized SQL queries ($1, $2). But: WebSocket auth uses `x-user-id` header (forgeable), `.parse()` can leak Zod error details, no CSRF protection on WebSocket, `requireAuth()` throw pattern loses context. |
| Performance | 5 | **3** | PostgreSQL full-text search (`to_tsvector` + `plainto_tsquery`) with ILIKE fallback — good. Transaction support for multi-step operations. But: lock expiry not enforced on read (expired locks still show as active), no connection pooling config (uses default pg Pool). |
| DX & maintainability | 5 | **2** | README exists (basic). `package.json` has db:setup and db:seed scripts — nice. But: no `.env.example`, all env vars have hardcoded fallbacks (postgres password = "password"), no `.gitignore` for db files. All deps in `dependencies` (no devDependencies separation). |

### 6. BONUS / PENALTY (-8)

| Item | Points |
|---|---|
| +2 Recursive CTE for page depth enforcement (spec requires max depth 5) | +2 |
| +2 WebSocket server with presence broadcast (working implementation) | +2 |
| +1 Full-text search with fallback strategy | +1 |
| +1 DB seed script for development | +1 |
| -5 17 console.error statements across all routes | -5 |
| -3 5 explicit `any` types | -3 |
| -3 Zero tests (complete absence) | -3 |
| -2 .parse() instead of .safeParse() (can leak Zod internals) | -2 |
| -1 types/index.ts barrel export | -1 |
| **Net** | **-8** |

---

## TOTAL: 37/100

| Category | Max | Score |
|---|---|---|
| Functionality | 20 | 14 |
| Code Quality | 20 | 12 |
| Architecture | 15 | 11 |
| Test Quality | 15 | 0 |
| Production Readiness | 15 | 8 |
| Bonus/Penalty | ±15 | -8 |
| **Total** | **100** | **37** |

---

## Context: Project Difficulty Comparison

Project-2 (★★☆) is substantially harder than Project-1 (★☆☆):

| Dimension | Project 1 | Project 2 |
|---|---|---|
| Users | Single-user | Multi-user |
| Database | SQLite (simple) | PostgreSQL (complex) |
| Real-time | None | WebSocket presence |
| Data model | 2 tables | 4 tables + self-referential hierarchy |
| Features | CRUD + filter/sort | CRUD + revisions + locks + search + hierarchy |
| Rendering | Plain text | Markdown → HTML with TOC |

Kimi's project-1 baseline scored 56/100. The 37/100 on project-2 reflects both the increased difficulty and the baseline model's limitations without infrastructure support.

---

## Key Issues for Infra to Address

| Issue | Points lost | Fix approach |
|---|---|---|
| Zero tests | -15 (entire category) + -3 penalty | Testing skills + test templates |
| 17 console.error | -5 penalty + -3 error handling | Code-hygiene skill (zero console rule) |
| 5 `any` types | -3 penalty + -2 type safety | Code-hygiene skill (zero any rule) |
| .parse() not .safeParse() | -2 penalty + -1 error handling | Security skill (always safeParse) |
| No consistent response shape | -1 error handling + -1 API design | Architecture skill + api-response template |
| Raw SQL in route handlers | -1 separation | Architecture skill (all SQL in db layer) |
| No .env.example | -1 DX | Code-hygiene skill (.env.example required) |
| types/index.ts barrel | -1 penalty | Code-hygiene skill (no barrels) |

**Total recoverable: ~30 points** → kimi-skills-v2 on project-2 could potentially score 65-70.

---

## What Kimi Did Well (without any guidance)

Despite scoring 37, several things are notable:
- **Recursive CTE** for page hierarchy depth enforcement — correct and efficient
- **WebSocket server** with proper client tracking and presence broadcast
- **PostgreSQL full-text search** with `ts_rank` ordering and ILIKE fallback
- **Transaction support** for multi-step operations (page + first revision creation)
- **Slug generation** with uniqueness enforcement
- **Route group architecture** — `(app)` and `(auth)` groups correctly applied
- **Markdown rendering** with heading extraction for TOC
- **Seed scripts** — practical DX touch

The model understands the domain well. The issues are hygiene (console, any, tests) rather than capability — exactly what infrastructure is designed to fix.

---

## Score Comparison

| Run | Project | Model | Infra | Score |
|---|---|---|---|---|
| kimi baseline | 1 (★☆☆) | Kimi | none | 56 |
| kimi-skills-v2 | 1 (★☆☆) | Kimi | v1 | 88 |
| opus baseline | 1 (★☆☆) | Opus | none | 74 |
| opus-skills-v2 | 1 (★☆☆) | Opus | v1 | 89 |
| **kimi baseline** | **2 (★★☆)** | **Kimi** | **none** | **37** |

# Project 1: Task Manager — Opus vs Kimi Comparison

## Scoring Rubric (100 points)

---

### 1. FUNCTIONALITY (20 pts)

| Sub-category | Max | Opus | Kimi | Notes |
|---|---|---|---|---|
| **Spec Compliance** | 10 | **9** | **9** | Both implement all required features: auth, CRUD, filtering, sorting, priority colors, overdue highlights, empty states. Both missing minor a11y polish. |
| **Runtime Correctness** | 10 | **9** | **9** | Both build successfully (`.next/` present). All test suites pass (Opus: 67, Kimi: 44). |
| **Subtotal** | **20** | **18** | **18** | |

---

### 2. CODE QUALITY (20 pts)

| Sub-category | Max | Opus | Kimi | Notes |
|---|---|---|---|---|
| **Type Safety** | 5 | **5** | **5** | Both: strict mode, zero `any`, Zod aligned with TS types. Opus has minimal safe casts (db return types). Kimi uses `z.infer<>` well. |
| **Naming & Structure** | 5 | **5** | **4** | Opus: clean, no dumping grounds. Kimi: has a `types/` directory with barrel-like organization and a `lib/utils.ts`. |
| **Error Handling** | 5 | **5** | **4** | Both wrap all routes in try/catch with consistent response shapes. Kimi: 9 `console.error()` statements in production code. |
| **Idiomatic Patterns** | 5 | **4** | **4** | Both use App Router correctly. Opus: server component shell + client child (idiomatic). Kimi: tasks page is fully client-side, slightly less idiomatic. |
| **Subtotal** | **20** | **19** | **17** | |

---

### 3. ARCHITECTURE (15 pts)

| Sub-category | Max | Opus | Kimi | Notes |
|---|---|---|---|---|
| **Separation of Concerns** | 5 | **5** | **5** | Both cleanly separate: db layer, auth, API routes, components. |
| **API Design** | 5 | **5** | **5** | Both: RESTful, consistent `{success, data, error}` shape, proper status codes, ownership returns 404 not 403. |
| **File Organization** | 5 | **5** | **4** | Opus: colocated tests (spec requirement). Kimi: `__tests__/` directory — violates the "colocate tests next to source" rule. |
| **Subtotal** | **15** | **15** | **14** | |

---

### 4. TEST QUALITY (15 pts)

| Sub-category | Max | Opus | Kimi | Notes |
|---|---|---|---|---|
| **Coverage** | 5 | **4** | **3** | Opus: 67 tests — validators (26), DB ops (20), API routes (16), components (8). Kimi: 44 tests — validators (30), auth integration (11), tasks integration (3). No component tests. |
| **Test Design** | 5 | **4** | **4** | Both use in-memory SQLite for isolation. Both have the same authenticated-route testing gap. |
| **Meaningful Assertions** | 5 | **5** | **4** | Opus: verifies response shapes, error codes, DB state, component rendering, overdue highlighting. Kimi: solid validation tests but fewer integration assertions. |
| **Subtotal** | **15** | **13** | **11** | |

---

### 5. PRODUCTION READINESS (15 pts)

| Sub-category | Max | Opus | Kimi | Notes |
|---|---|---|---|---|
| **Security Basics** | 5 | **3** | **2** | Opus: proper iron-session encryption, BUT SQL injection in `updateTask()` field name interpolation. Kimi: bcrypt + Zod + parameterized queries, BUT session is just base64-encoded JSON — not cryptographically signed. Forgeable. |
| **Performance Awareness** | 5 | **4** | **4** | Both: SQLite WAL mode, proper indexes, no N+1 queries. |
| **DX & Maintainability** | 5 | **2** | **2** | Both missing `.env.example`. Opus: no README. Kimi: default Next.js README (not project-specific). |
| **Subtotal** | **15** | **9** | **8** | |

---

### 6. BONUS / PENALTY (±15 pts)

| Item | Opus | Kimi |
|---|---|---|
| +5 Clever simplification | +2 (crypto.randomUUID() avoids uuid dep) | +0 |
| +5 Edge cases spec didn't mention | +2 (WAL mode, user-existence check on /me) | +1 (description max 5000 chars) |
| +5 Excellent a11y | +2 (aria-labels, role="dialog", aria-modal, role="alert") | +1 (Modal ARIA) |
| -5 Unused dependencies | 0 | **-3** (iron-session imported but not used; uuid unnecessary) |
| -5 Console.log in production | 0 | **-3** (9 console.error in API routes) |
| -5 Hardcoded values | -1 (hardcoded session secret fallback) | -1 (similar) |
| -10 Security vulnerability | **-5** (SQL injection in updateTask — partially mitigated by Zod) | **-7** (unsigned session cookies — forgeable) |
| **Subtotal** | **+0** | **-12** |

---

### FINAL SCORES

| Category | Max | Opus | Kimi |
|---|---|---|---|
| Functionality | 20 | 18 | 18 |
| Code Quality | 20 | 19 | 17 |
| Architecture | 15 | 15 | 14 |
| Test Quality | 15 | 13 | 11 |
| Production Readiness | 15 | 9 | 8 |
| Bonus/Penalty | ±15 | +0 | -12 |
| **TOTAL** | **100** | **74** | **56** |

---

### Key Differentiators

| Dimension | Opus Advantage | Kimi Advantage |
|---|---|---|
| Tests | 67 vs 44; includes component tests and DB layer tests | More thorough validation unit tests (30 vs 26) |
| Security | Proper iron-session encryption | All SQL queries fully parameterized (no injection risk) |
| Architecture | Colocated tests per spec; server component shell pattern | More granular component breakdown (ui/, forms/, task/, layout/) |
| Dependencies | No unused deps; crypto.randomUUID() | — |
| Clean code | Zero console statements in production | — |

---

### Verdict

**Opus wins 74–56.** Both implement the full spec and build successfully, but Opus is cleaner: more tests, colocated per spec, no unused deps, no console statements, and proper session encryption. Opus's main weakness is SQL injection in `updateTask()` field name interpolation (partially mitigated by Zod). Kimi's critical flaw is the unsigned base64 session cookie — forgeable auth despite importing iron-session — combined with unused deps and console.error in production.

---

## TDD Observations

### What Worked
- Tests-first anchored the API contract — both models converged on the `{success, data, error}` response shape
- Validation tests drove solid Zod schemas in both implementations

### What Didn't
- Big-batch test writing (all tests → all code) is too rigid for agents
- Both struggled with session mocking, retreating to 401-only route tests
- Same agent writing tests and code removes the adversarial dynamic that makes TDD effective

### Recommendations for Agent TDD
1. **Tight loops over big batches** — prompt per feature, not per phase
2. **Provide test infrastructure upfront** — session helpers, DB fixtures
3. **Separate test-writer from code-writer** — different agents for genuine tension
4. **Contract tests over unit tests** — harder for agents to game
5. **Use tests as acceptance gates, not design tools** — agents make tests pass but don't discover design problems through tests

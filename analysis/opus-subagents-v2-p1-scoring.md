# opus-subagents-v2-p1 Scoring — Project 1: Task Manager

**Model**: Opus  
**Infra**: subagents v2 (intent framing + behavioral seam tests)  
**Pipeline**: subagent-driven, 6 phases  
**Date**: 2026-04-09  
**Scored**: 2026-04-09  
**Previous v1 score**: 93

---

## Build Overview

| Metric | Value |
|---|---|
| Tests passing | 179/179 |
| Test files | 17 |
| Build | Success |

---

## Rubric Scoring

### 1. FUNCTIONALITY (20/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | 10 | All 9 API routes. All UI: filters, sort (functional), create, edit, delete with ConfirmDialog, PRIORITY_CLASSES, overdue highlight, empty states, responsive. |
| Runtime correctness | 10 | 10 | 179/179 tests pass. tsc clean. next build succeeds. |

### 2. CODE QUALITY (20/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | 5 | strict: true. Zero any. z.infer exports. All route handlers typed. |
| Naming & structure | 5 | 5 | Well-named. TasksClient.tsx 282 lines (acceptable). Small focused components. |
| Error handling | 5 | 5 | All routes try/catch. All mutations check json.success and show error state. void on async calls. Build log shows specific fixes for silent mutation failures. |
| Idiomatic patterns | 5 | 5 | Server component for tasks/page.tsx. 'use client' only where needed. useCallback with proper deps. |

### 3. ARCHITECTURE (15/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | 5 | Clean: db.ts → validators.ts → api-response.ts → session.ts → routes → components. |
| API design | 5 | 5 | RESTful. Consistent helpers. Proper status codes. |
| File organization | 5 | 5 | Colocated tests. tests/helpers/. Path aliases. |

### 4. TEST QUALITY (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | 5 | 179 tests: validators (42), DB (28), auth routes (26), task routes (32), components (6 files), seam tests (13), compliance (5). Edge cases: boundary lengths, cross-user isolation, overdue, NULLS LAST sort. |
| Test design | 5 | 4 | Factories (buildTask, createUserInDb, createTaskInDb) ACTUALLY USED in all tests — fixes v1 dead code issue. Proper teardown. **-1**: broken findFiles in compliance.test.ts — same v1 bug persists, all 5 meta-tests pass vacuously. |
| Meaningful assertions | 5 | 5 | Verifies password_hash absent, cross-user 404, sort ordering by position, seam roundtrips. |

### 5. PRODUCTION READINESS (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | 5 | Parameterized SQL. UPDATABLE_COLUMNS + SORT_MAP whitelists. bcrypt cost 10. Generic auth errors. 404 not 403 for other users' resources. |
| Performance | 5 | 4 | WAL mode. 3 indexes. No N+1. **-1**: refetch-after-mutation (minor), priority sort not index-backed. |
| DX & maintainability | 5 | 5 | README, .env.example, scripts, .gitignore, BUILD_LOG.md, REVIEW.md. |

### 6. BONUS / PENALTY (+4)

| Item | Points |
|---|---|
| +3 Behavioral seam tests (13 in tests/integration/seams.test.ts) | +3 |
| +2 Edge cases: overdue excludes done, NULLS LAST, email normalization, cleanPayload | +2 |
| +1 Accessibility: htmlFor, role=alert, role=dialog with aria-labelledby | +1 |
| -2 Broken compliance tests (findFiles bug, all 5 pass vacuously) | -2 |
| **Net** | **+4** |

---

## TOTAL: 93/100

## v1 vs v2 Comparison

| | v1 (opus-subagents-p1) | v2 (opus-subagents-v2-p1) |
|---|---|---|
| Score | 93 | 93 |
| Tests | 193 | 179 |
| Factories used? | Yes | Yes |
| Seam tests? | No | Yes (13) |
| Compliance tests work? | Unknown | No (same bug) |
| Sort works? | Yes | Yes |

Same score, better composition. Fewer tests but with real seam tests. The compliance test bug was specifically flagged from v1 but not fixed in v2.

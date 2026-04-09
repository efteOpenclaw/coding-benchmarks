# opus-superpowers-p2 Scoring — Project 2: Collaborative Wiki

**Model**: Opus  
**Infra**: superpowers (subagent-driven)  
**Pipeline**: single-shot  
**Date**: 2026-04-03  
**Scored**: 2026-04-09

---

## Build Overview

| Metric | Value |
|---|---|
| Tests passing | 209/210 (1 flaky) |
| Test files | 26 |
| Build | Success |

---

## Rubric Scoring

### 1. FUNCTIONALITY (15/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Spec compliance | 10 | 8 | All API routes present. UI has sidebar tree, markdown rendering, split-pane editor, lock banner, revision history, search, breadcrumbs. **Missing**: (1) Page delete uses ON DELETE SET NULL — children orphaned, spec says cascade. (2) No presence avatars in UI — WebSocket server built but never consumed by any client component. broadcastPageUpdate/broadcastLockAcquired/broadcastLockReleased exported but never imported. Classic subagent seam problem. |
| Runtime correctness | 10 | 7 | 209/210 tests pass. 1 flaky: db.test.ts > Revisions > gets latest revision (pg-mem timestamp). PATCH route computes newSlug but never writes it. |

### 2. CODE QUALITY (18/20)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Type safety | 5 | 5 | strict: true. Zero any. Zod with z.infer exports. |
| Naming & structure | 5 | 4 | Clean naming. db.ts at 340 lines (borderline). |
| Error handling | 5 | 4 | Every route has try/catch. SidebarClient.tsx and PageClient.tsx silently swallow errors. |
| Idiomatic patterns | 5 | 5 | Proper App Router, server components for auth, async params. |

### 3. ARCHITECTURE (14/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Separation of concerns | 5 | 4 | Clean layering. db.ts mixes data access with some business logic. |
| API design | 5 | 5 | RESTful. Consistent envelope. Proper status codes. Nested routes. |
| File organization | 5 | 5 | App Router structure, route groups, co-located tests. |

### 4. TEST QUALITY (12/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Coverage | 5 | 4 | 210 tests. Every route tested. Missing: no WebSocket integration test, no depth enforcement test. |
| Test design | 5 | 4 | Independent. Factory helpers. pg-mem. 1 flaky test. Meta-tests. |
| Meaningful assertions | 5 | 4 | Status codes, response structure, field values. onSelectRevision is no-op and no test catches it. |

### 5. PRODUCTION READINESS (13/15)

| Sub-category | Max | Score | Evidence |
|---|---|---|---|
| Security | 5 | 5 | Zod. Parameterized SQL. bcryptjs. Generic auth errors. PAGE_UPDATABLE whitelist. httpOnly cookies. |
| Performance | 5 | 4 | No N+1. getBreadcrumbs/getPageDepth use iterative queries instead of recursive CTE. |
| DX & maintainability | 5 | 4 | README, .env.example, scripts work. No migration file. |

### 6. BONUS / PENALTY (+1)

| Item | Points |
|---|---|
| +3 Meta-test suite | +3 |
| +1 Self-review checklist (REVIEW.md) | +1 |
| -2 Presence UI not wired (seam problem) | -2 |
| -1 Cascade delete spec violation | -1 |
| **Net** | **+1** |

---

## TOTAL: 73/100

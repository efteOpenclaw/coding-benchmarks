# Infra v1 — Changelog

## v1 (2026-03-31)

Initial version. Derived from:
- Opus baseline run (74/100) — extracted golden patterns as templates
- Kimi baseline run (56/100) — identified failures that templates and rules should prevent
- Kimi-skills run (4/100) — identified context overflow as a risk, informed skill-per-agent design

### Templates (8 files)
Extracted from Opus's 74-scoring build with annotations:
- `api-response.ts` — Response envelope helpers
- `api-route.ts` — Route handler pattern (auth → validate → operate → respond)
- `api-route.test.ts` — Route test pattern (in-memory DB, direct handler call)
- `component.tsx` — Client component pattern (named export, props interface, a11y)
- `component.test.tsx` — Component test pattern (testing-library, vi.fn())
- `db-query.ts` — Data access pattern (singleton, parameterized, whitelist)
- `validator.ts` — Zod schema pattern (per-operation, z.infer exports)
- `session.ts` — iron-session pattern (encrypted cookies, two getters)

### Skills (4 files)
Copied from kimi-skills workspace (created in session 1):
- `testing.md` (737 lines)
- `security.md` (386 lines)
- `code-hygiene.md` (334 lines)
- `architecture.md` (383 lines)

### Rules (4 files)
New. Prescriptive per-directory rules with code examples:
- `api-routes.md` — Route handler structure and rules
- `components.md` — Component structure and rules
- `data-access.md` — DB layer structure and rules
- `tests.md` — Test structure and rules

### Lint (1 file)
New. `check.sh` enforces: no console, no any, no default exports, no barrels, colocated tests, no raw NextResponse.json.

### Designed to prevent
| Kimi issue (56 run) | Prevention mechanism |
|---|---|
| Unsigned base64 session | `session.ts` template shows iron-session |
| 9 console.error statements | `check.sh` lint rule #1 |
| Unused deps (iron-session, uuid) | `code-hygiene.md` skill, dependency justification in plan |
| Tests not colocated | `tests.md` rule #1, `check.sh` lint rule #5 |
| No component tests | `test-writer.md` prompt requires them |
| Missing .env.example + README | `builder.md` prompt requires them |

| Opus issue (74 run) | Prevention mechanism |
|---|---|
| SQL injection in updateTask | `db-query.ts` template shows UPDATABLE_COLUMNS whitelist |
| Hardcoded session secret fallback | `session.ts` template + `security.md` skill |
| Missing .env.example | `builder.md` prompt requires it |

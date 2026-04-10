# Workspace: __WORKSPACE__

You are building a Collaborative Notes Wiki with **PostgreSQL** (NOT SQLite). This is production code for a real team. Every decision should reflect what you'd ship with confidence, not what passes a checklist.

## How to use

1. Read `~/prompts/build.md` — build instructions with rules and skill references
2. Read `~/projects/project-2.md` — the project spec
3. Your run folder is `__RUN_DIR__` — `cd` there FIRST, all output goes there
4. Skills in `~/skills/`, templates in `~/templates/`

## CRITICAL: This is a PostgreSQL project

- Use `pg` (node-postgres) with Pool — NOT better-sqlite3, NOT SQLite
- All DB functions are **async** (`await pool.query(...)`)
- Use `$1, $2, $3` parameterization — NOT `?` placeholders
- Use `NOW()` for timestamps — NOT `datetime('now')`
- Use `TIMESTAMPTZ` columns — NOT `TEXT` for dates
- Do NOT read SQLite skills/templates (`db-query.ts`, `env-config.md`, `test-factories.md`)

## CRITICAL: Tailwind CSS v4

- PostCSS plugin is `@tailwindcss/postcss` — NOT `tailwindcss`
- globals.css uses `@import 'tailwindcss'` — NOT `@tailwind base/components/utilities`
- Do NOT create `tailwind.config.ts` — v4 does not need it

## CRITICAL: pg-mem pool lifecycle

- `tests/helpers/setup.ts` manages the pg-mem pool — it calls `setPool()`, `initDb()`, and cleanup
- **NEVER call `closePool()` or `initDb()` in individual test files** — this destroys the pg-mem pool and causes tests to try connecting to a real PostgreSQL server
- Route tests just import the handler and call it — the pool is already injected

## Key rules (always active)

1. Zero `any` types — including `as any`
2. Zero console statements (use `throw` for startup errors)
3. Always `.safeParse()` — never `.parse()`
4. Always use response helpers — never manual `Response.json`
5. Always whitelist column names for dynamic SQL
6. Colocate tests with source files
7. Every test file imports from factories — never hardcode test data
8. **PostgreSQL via pg** — NOT SQLite
9. Meta-tests in `tests/meta/compliance.test.ts` enforce rules 1-4, 6-7 — do NOT modify or delete them

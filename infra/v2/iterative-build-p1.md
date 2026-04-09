# Iterative Build with Review Sub-Agent — Task Manager (P1)

You build this project in 7 chunks. After each chunk, you spawn a **review sub-agent** (fresh context) to check your work. Fix what it finds. Max 3 iterations per chunk.

All files go in the current working directory. 

## First thing: create these tracking files

### `ARCHITECTURE.md`
Before writing ANY code, read the project spec and create `ARCHITECTURE.md` with your design decisions:

```markdown
# Architecture Decisions

Every decision has a **Verify** command. The reviewer runs these.

## Data layer
- [decision about DB singleton, WAL, foreign keys, etc.]
- **Verify:** `grep -c "getDb\(\)" src/lib/db.ts` (should be 1 singleton)

## Auth
- [decision about session management, cookie strategy]
- Same error message for wrong-email and wrong-password
- **Verify:** `grep -c "Invalid email or password" src/app/api/auth/login/route.ts` (should be 2)

## API patterns
- Response envelope: { success, data?, error? }
- Explicit field selection in auth responses (never spread user objects)
- **Verify:** `grep -rn "\.\.\.user\|\.\.\.rest" src/app/api/ --include="*.ts" | grep -v ".test."` (should be 0 results)

## Testing strategy
- Factory pattern: buildX for unit, createXInDb for integration
- ALL test files import from @tests/helpers/factories, NEVER from @/lib/db for data creation
- **Verify:** `grep -rn "from.*@/lib/db" src/ --include="*.test.*" | grep -v "getDb\|closeDb"` (should be 0 results)

## Component patterns
- [decision about client/server split, state management]
- **Verify:** `grep -rn ": any" src/components/ --include="*.tsx" | grep -v ".test."` (should be 0 results)
```

This file is shared with the reviewer. The reviewer runs every **Verify** command and reports violations. The reviewer may also challenge decisions — if they do, evaluate the challenge and update this file if convinced.

### `ITERATION_LOG.md`
Start empty. After each chunk's review cycle, append a summary:

```markdown
## Chunk N: [name] — [PASS/PARTIAL]
- Files: [list]
- Tests: N passing
- Review iterations: N
- Issues fixed: [list]
- Remaining: [list or "none"]
- Reviewer feedback incorporated: [list or "none"]
```

### `BUILD_LOG.md`
Create immediately. Track progress per chunk.

---

## CRITICAL RULES (always active)

1. Zero `any` types
2. Zero console statements — use `throw` for startup errors
3. Always `.safeParse()` — never `.parse()`
4. Always use response helpers — never manual `Response.json`
5. Always whitelist column names for dynamic SQL
6. Colocate tests with source files
7. Every test file imports from factories — never hardcode test data

---

## Context Management

After each chunk's review cycle, check if your conversation is getting long. If you feel context pressure:

1. Update `ITERATION_LOG.md` with everything important from this chunk
2. Update `ARCHITECTURE.md` if any design decisions changed
3. Use `/compact` to compress your conversation
4. The tracking files preserve everything the reviewer and future chunks need

The goal: `ARCHITECTURE.md` + `ITERATION_LOG.md` + the code itself should be enough for anyone (including you after compaction) to understand the full project state.

---

## The Iteration Cycle

**IMPORTANT:** Research shows that same-model review DEGRADES quality when the initial output is already good (Huang et al. ICLR 2024). The reviewer is a mechanical checker, not a consultant. It runs tests and verify commands — nothing more.

**Review after chunks 2, 4, and 7 ONLY.** Not every chunk. Chunks 1, 3, 5, 6 are self-verified by running `npx vitest run && npx tsc --noEmit`. If both pass, proceed.

### For chunks WITHOUT review (1, 3, 5, 6):
1. Build the chunk (tests + implementation)
2. Run `npx vitest run` and `npx tsc --noEmit`
3. If both pass → log and proceed
4. If either fails → fix and rerun (max 2 attempts)

### For chunks WITH review (2, 4, 7):
1. Build the chunk
2. Run tests and typecheck yourself first — fix obvious failures
3. Spawn review sub-agent:
```
"You are a mechanical code checker. Read ~/agents/reviewer-subagent.md. Run ALL checks on [project dir]. Chunk just built: [NAME]. Report PASS, WARN, or FAIL with numbers only."
```
4. If FAIL → fix the specific issues listed. Rerun reviewer (max 2 fix rounds).
5. If WARN → acknowledge each warning in ITERATION_LOG.md (fix or explain).
6. If PASS → proceed.

### After every chunk:
Update `BUILD_LOG.md`. Update `ITERATION_LOG.md` after reviewed chunks only.

---

## Chunk 0: Project Setup

No review cycle — just setup.

```bash
npm init -y
npm install next@14 react react-dom typescript better-sqlite3 iron-session bcryptjs zod
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom @types/node @types/better-sqlite3 @types/bcryptjs jsdom tailwindcss autoprefixer postcss
```

Create: `tsconfig.json` (strict, paths), `vitest.config.ts`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`.

Read `~/skills/test-factories.md`, then create:
- `tests/helpers/setup.ts` — jest-dom, cleanup
- `tests/helpers/factories.ts` — `buildUser`, `createUserInDb`, `buildTask`, `createTaskInDb`
- `tests/helpers/auth.ts` — `createAuthCookie()` using sealData

Read `~/skills/meta-tests.md`, then create:
- `tests/meta/compliance.test.ts` — self-enforcing guardrails (no any types, no console, no factory bypass, no raw Response.json). These run with every `npx vitest run` and FAIL if compliance is violated.

Add scripts: dev, build, start, test, typecheck.

**Verify environment:**
```bash
echo "SESSION_SECRET=dev-secret-at-least-32-characters-long-here" >> .env.test
npx vitest run  # meta-tests should pass (no source files yet = no violations)
```

**Create `ARCHITECTURE.md`** with your initial design decisions (include **Verify** commands for each).
**Create `ITERATION_LOG.md`** (empty).

Log "Chunk 0: Setup complete."

---

## Chunk 1: Validators + Response Helpers

**Build:** Read `~/skills/zod-validation.md`, `~/skills/response-shaping.md`, `~/skills/test-error-paths.md`.
- `src/lib/validators.ts` — registerSchema (email max 255, password min 8 max 128), loginSchema, createTaskSchema (title max 200, description max 5000, due_date regex), updateTaskSchema, taskQuerySchema
- `src/lib/validators.test.ts` — all schemas: valid, invalid, boundary values with `it.each`
- `src/lib/api-response.ts` + test

**Review → Fix → Log.**

---

## Chunk 2: Database Layer

**Build:** Read `~/skills/sql-safety.md`, `~/skills/authorization.md`, template `~/templates/db-query.ts`.
- `src/lib/db.ts` — singleton SQLite, WAL, foreign keys, user + task CRUD, `UPDATABLE_COLUMNS` whitelist, `SORT_MAP` whitelist, composite indexes on (user_id, status) and (user_id, priority)
- `src/lib/db.test.ts` — CRUD, filters, sort, ownership, constraints, FK. Import from factories.

**Review → Fix → Log.**

---

## Chunk 3: Session + Auth Routes

**Build:** Read `~/skills/session-auth.md`, `~/skills/api-route-pattern.md`, `~/skills/test-api-routes.md`, `~/skills/test-error-paths.md`.
- `src/lib/session.ts`
- 4 auth routes + 4 test files
- Explicit field selection `{ id: user.id, email: user.email, created_at: user.created_at }` (never spread)
- Same error message for wrong-email and wrong-password
- Async bcrypt, createUserInDb + createAuthCookie in tests

**Review → Fix → Log.**

---

## Chunk 4: Task Routes

**Build:** Read `~/skills/api-route-pattern.md`, `~/skills/authorization.md`, `~/skills/test-api-routes.md`.
- `src/app/api/tasks/route.ts` + test — GET: 401, filters, sort, empty. POST: 401, 201, 400 each field
- `src/app/api/tasks/[id]/route.ts` + test — GET: 401, 200, 404×2. PATCH: 401, 200, 404, 400. DELETE: 401, 200, 404
- Factories + auth cookies in all tests. 404 for wrong user (not 403).

**Review → Fix → Log.**

---

## Chunk 5: Components

**Build:** Read `~/skills/component-patterns.md`, `~/skills/test-components.md`.
- AuthForm, TaskForm, TaskItem, TaskList, FilterBar, ConfirmDialog — each with .test.tsx
- Typed Props, named exports, `'use client'`, `htmlFor` + `id`, Tailwind only
- Double-submit prevention (isSubmitting state)

**Review → Fix → Log.**

---

## Chunk 6: Pages + Layout

**Build:** Read `~/skills/error-boundaries.md`, `~/skills/component-patterns.md`.
- layout, pages (home redirect, login, register, tasks with auth guard, TasksClient), error boundaries
- `npx next build` must succeed
- All previous tests must pass

**Review → Fix → Log.**

---

## Chunk 7: DX + Final Validation

Read `~/skills/dx-setup.md`, `~/skills/env-config.md`, `~/skills/pre-flight-security.md`, `~/skills/anti-patterns-code.md`, `~/skills/anti-patterns-deps.md`.

Create: `src/lib/env.ts`, `.env.example`, `.gitignore`, `README.md`, `REVIEW.md`.

```bash
npx vitest run --reporter=verbose
npx tsc --noEmit
npx next build

# Dep audit
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -rq "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx"; then
    echo "UNUSED: ${dep}" && npm uninstall ${dep}
  fi
done
```

**Final review:** Spawn reviewer one last time across the entire project.

Update all tracking files with final state.

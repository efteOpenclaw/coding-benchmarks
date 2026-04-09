# Build a Next.js Fullstack Application

You are building a fullstack app from a spec. Follow the phases below in order. **Do not skip phases.**

## CRITICAL RULES (always active, never skip)

1. Zero `any` types — use `unknown` then narrow, or type explicitly
2. Zero `console.log` / `console.error` — use `throw new Error()` for startup failures
3. Always `.safeParse()` — never `.parse()` (it throws and leaks Zod internals)
4. Always use response helpers (`successResponse` / `errorResponse`) — never raw `Response.json`
5. Always whitelist column names for dynamic SQL (UPDATE SET, ORDER BY)
6. Colocate tests: `thing.ts` → `thing.test.ts` in same directory
7. Run unused dep audit before finishing — remove anything not imported

---

## Setup

Create your run folder at the absolute path specified in CLAUDE.md (e.g. `/home/USERNAME/runs/YYMMDD-MODEL/`). NEVER use `~/runs/` or `/app/runs/` — always the full absolute path from CLAUDE.md.
Run `npm init -y` inside it. Create `BUILD_LOG.md` immediately.

---

## Phase 1: PLAN

You have skills available in `~/skills/`. Read the relevant ones — their descriptions tell you when they apply. For planning, `architecture.md` is essential.

**Before proceeding to Phase 2, write in BUILD_LOG.md:**
- 3 architecture takeaways you will apply
- Your complete file tree
- Every dependency with one-line justification

Create `PLAN.md` with: file tree, data model (SQL), API surface, component hierarchy, dependencies, edge cases, scope exclusions, decisions with alternatives.

Do not write code.

---

## Phase 2: TESTS

Read `~/skills/test-infrastructure.md` before creating any test files. When writing individual tests, `test-writing.md` has the patterns.

Write in this order:
1. `vitest.config.ts`
2. `tests/helpers/setup.ts`
3. `tests/helpers/factories.ts` — with `build*` AND `create*InDb` functions
4. All test files (colocated with where source will be)

**Before proceeding to Phase 3, write in BUILD_LOG.md:**
- How many test files created
- Total test count
- Confirm: "factories.ts exports build* and create*InDb functions"
- Confirm: "every test file imports from factories or test helpers"

Tests MUST fail at this point. Run `npx vitest run` and log output.

---

## Phase 3: CODE

Read `~/skills/security.md` before implementing auth, sessions, database, or validation. Skills are also available for architecture patterns if needed.

**Before writing each file, read the matching template:**
- `lib/api-response.ts` → read `~/templates/api-response.ts`
- `lib/db.ts` → read `~/templates/db-query.ts`
- `lib/session.ts` → read `~/templates/session.ts`
- `lib/validators.ts` → read `~/templates/validator.ts`
- API routes → read `~/templates/api-route.ts`
- Components → read `~/templates/component.tsx`

**Build order** (dependencies first):
1. `lib/validators.ts` (Zod schemas)
2. `lib/api-response.ts` (response helpers)
3. `lib/db.ts` (database layer — ALL SQL here, nowhere else)
4. `lib/session.ts` (iron-session)
5. API routes (auth first, then resources)
6. Components
7. Pages, layouts, error boundaries
8. Config: tailwind, next.config, `.env.example`, `README.md`

**After each file:** run `npx tsc --noEmit`. Fix errors before moving on.

**Response shaping rule:** When returning user data, explicitly select fields:
```typescript
// ALWAYS — explicit field selection
return successResponse({ user: { id: user.id, email: user.email, created_at: user.created_at } });

// NEVER — spread (leaks future sensitive fields)
const { password_hash, ...rest } = user;
return successResponse({ user: rest });
```

---

## Phase 4: VALIDATE

Run each command and log FULL output to BUILD_LOG.md:

```bash
npx vitest run --reporter=verbose
npx tsc --noEmit
npx next build
bash ~/lint/check.sh .
```

**For each failing test:**
1. Read the error — don't guess
2. Log hypothesis in BUILD_LOG.md
3. Fix (max 3 attempts per failure)
4. Log what you changed

---

## Phase 5: REVIEW

**Run the unused dependency audit:**
```bash
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -r "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx" -q; then
    echo "UNUSED: ${dep}"
  fi
done
```
**If anything is unused, run `npm uninstall <package>` now.**

**Verify these — log each result in BUILD_LOG.md:**
```
□ grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -v ".test." → zero results
□ grep -r ": any" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." → zero results
□ Every test file imports from factories.ts or test helpers
□ All tests pass
□ Build succeeds
□ Lint passes
```

Write `REVIEW.md` with confidence scores, weaknesses, and what you'd improve.

**Final BUILD_LOG.md summary:**
```
- Phases completed: 5/5
- Files created: N
- Tests: N passing / N failing
- Skills read: [list]
- Templates followed: [list]
- Dep audit: PASS / removed [list]
- Lint: PASS / issues [list]
```

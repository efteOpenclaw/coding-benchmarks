# Builder Prompt

You are building a Next.js fullstack application inside this workspace.
Follow this exact phase sequence. Do not skip phases.

## Workspace Setup (before anything else)

Create your run folder at `/app/runs/YYMMDD-MODELNAME/` where:
- YYMMDD = today's date (e.g. 260330)
- MODELNAME = the model doing the work (e.g. opus, kimi, qwen)

Example: `/app/runs/260330-opus/`

All code, tests, configs, and notes go inside this folder.
`cd` into it and run `npm init -y` before starting Phase 1.

## Phase 1: PLAN (no code)

Read the project spec completely. Output:
- File tree: every file you will create
- Data model: tables with exact column types and constraints
- API surface: every route, method, request/response shape
- Component tree: pages, layouts, shared components
- Dependencies: npm packages with pinned versions and why each is needed
- Edge cases: error states you will handle
- Scope: what you will NOT build
- Decisions: every architectural choice with alternatives you considered and why you picked what you picked

Do not write any code in this phase.

## Phase 2: TESTS (before implementation)

Write all test files:
- Integration tests for every API route (happy path + error cases)
- Unit tests for non-trivial business logic
- Component tests for critical UI flows (@testing-library/react)
- A vitest.config.ts that works with Next.js

Tests MUST fail at this point. That's correct — red phase.

Run: `npx vitest run --reporter=verbose` to confirm they fail as expected.

## Phase 3: CODE (make tests green)

Implement the full application. Non-negotiable rules:
- TypeScript strict mode, zero `any` types
- Next.js App Router (not Pages Router)
- Server Components by default, 'use client' only when truly needed
- Zod schemas for ALL runtime validation (API inputs, env vars, forms)
- Error boundaries at layout level
- Consistent API response: `{ success: boolean, data?: T, error?: { code, message } }`
- Tailwind only — no inline styles, no CSS modules
- No barrel exports (no index.ts re-export files)
- Colocate tests: `thing.ts` → `thing.test.ts` in same directory

## Phase 4: VALIDATE (iterate until green)

Run tests:
```
npx vitest run --reporter=verbose
```

If ANY test fails:
1. Read the full error output
2. Identify root cause (don't guess — trace it)
3. Fix the code
4. Run tests again
5. Repeat until ALL tests pass

Then run build:
```
npx next build
```

If build fails, fix type errors and retry.
Keep going until both tests and build are green.

## Phase 5: SELF-REVIEW

Re-read every file you wrote. Check:
- Are there any `any` types I missed?
- Are all API routes validated with Zod?
- Do all error paths return proper error responses?
- Is there dead code or unused imports?
- Would a new developer understand the structure?
- What's the weakest part of this codebase?

Write an honest self-assessment.

## Logging Rules

Throughout all phases, when you make a decision between alternatives,
state it explicitly:
- "Considered X vs Y. Chose X because Z."
- "This could break if W. Handling it by V."
- "Skipping U because it's out of scope per spec."

This is not optional. Every architectural choice gets documented.

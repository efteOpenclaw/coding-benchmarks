# Benchmark

You are building a fullstack Next.js application from a spec.
Everything you need is in this repo.

## Your first step

1. Read the project spec: `/app/projects/project-{N}.md`
2. Create your run folder: `/app/runs/YYMMDD-MODELNAME/`
   - YYMMDD = today's date (e.g. 260330 for March 30, 2026)
   - MODELNAME = your model name (e.g. opus, kimi, qwen)
3. `cd` into that folder and start Phase 1

## Phases — follow in order, do not skip

### Phase 1: PLAN

No code yet. Read the entire spec. Write `PLAN.md` in your run folder with:

- **File tree**: every file you will create
- **Data model**: exact SQL CREATE TABLE statements
- **API surface**: every route, method, request shape, response shape
- **Component tree**: pages, layouts, shared components
- **Dependencies**: npm packages with exact versions and why each is needed
- **Edge cases**: what breaks, how you handle it
- **Out of scope**: what you will NOT build
- **Decisions**: every choice between alternatives, what you picked and why

### Phase 2: TESTS

Write all test files before any implementation code.

- Integration tests for every API route (happy path + every error path)
- Unit tests for non-trivial business logic
- Component tests for critical UI flows
- vitest.config.ts

Run `npx vitest run --reporter=verbose` — tests SHOULD fail. That's correct.

### Phase 3: CODE

Implement the application. Make the tests pass.

Rules (non-negotiable):
- TypeScript strict mode, zero `any` types anywhere
- Next.js App Router only (not Pages Router)
- Server Components by default, `'use client'` only when truly needed
- Zod for ALL runtime validation: API inputs, env vars, form data
- Error boundaries at layout level
- All API routes return: `{ success: boolean, data?: T, error?: { code: string, message: string } }`
- Tailwind CSS only — no inline styles, no CSS modules
- No barrel exports (no `index.ts` re-export files)
- Colocate tests next to source: `thing.ts` → `thing.test.ts`

### Phase 4: VALIDATE

```bash
npx vitest run --reporter=verbose
```

If any test fails:
1. Read the full error — don't guess
2. Trace to root cause
3. Fix the code
4. Run again
5. Repeat until ALL green

Then:
```bash
npx next build
```

If build fails, fix and retry. Keep going until both pass.

### Phase 5: REVIEW

Write `REVIEW.md` in your run folder:

- Confidence (1-10) for: type safety, error handling, test quality, architecture
- Known weaknesses
- What you'd improve with more time
- Hardest decision and why

## Decision logging

This is mandatory throughout ALL phases.
Every time you choose between alternatives, state it:

```
DECISION: [topic]
Options: A) ... B) ... C) ...
Chose: B
Reason: ...
Risk: ...
```

Write these inline as you work. They're as important as the code.

## Project specs

- `/app/projects/project-1.md` — Task Manager (★☆☆)
- `/app/projects/project-2.md` — Collaborative Wiki (★★☆)
- `/app/projects/project-3.md` — Multi-Tenant Tracker (★★★)

## Judging

When a run is complete, a separate session will score it using
`/app/prompts/judge.md` against the project spec.

Scoring is 100 points across:
- Functionality (20): spec compliance + runtime correctness
- Code Quality (20): types, naming, errors, idioms
- Architecture (15): separation, API design, file org
- Test Quality (15): coverage, design, assertions
- Production Readiness (15): security, performance, DX
- Bonus/Penalty (±15): a11y, cleverness, bugs, unused deps

# Static Pipeline: Non-Self-Improving Benchmark

## What this is

A fixed sub-agent pipeline for benchmarking AI code generation. Five specialized agents build a fullstack Next.js app from a spec, guided by templates, skills, and rules. The infrastructure is static — it does not change between runs.

Use this version to establish baselines before enabling the self-improving feedback loops described in `FINAL_ARCHITECTURE.md`.

---

## Architecture Overview

```
Spec ──→ [Planner] ──→ PLAN.md ──→ [Test Writer] ──→ test files
                                         │
                                         ▼
                                    [Builder] ──→ source code
                                         │
                                         ▼ (tests fail?)
                                    [Fixer] ──→ patched code  (max 3 iterations)
                                         │
                                         ▼ (tests pass)
                                    [Reviewer] ──→ REVIEW.md + score.json
```

---

## What's different from FINAL_ARCHITECTURE.md

| Feature | Final (self-improving) | Static (this) |
|---|---|---|
| Templates, skills, rules | Versioned, evolve via feedback | Fixed at v1, never change |
| INFRA_AUDIT.md | Reviewer produces it | Not produced |
| Cross-model validation | Automatic comparison | Manual |
| Infra evolution (v1 → v2) | Gated promotion | None |
| Score tracking | Automatic append + trend analysis | Manual append to scores.json |
| Feedback loops | 3 loops (audit, cross-model, evolution) | None |

Everything else is identical: same 5 agents, same templates, same skills, same rules, same lint.

---

## File Map

### Infrastructure (`/app/infra/v1/`)

```
infra/v1/
├── templates/                     # Golden files — agents mimic these patterns
│   ├── api-response.ts            # Response envelope: successResponse / errorResponse
│   ├── api-route.ts               # Route handler: auth → validate → operate → respond
│   ├── api-route.test.ts          # Route test: in-memory DB, direct handler call, assert status + shape
│   ├── component.tsx              # Client component: 'use client', props interface, named export
│   ├── component.test.tsx         # Component test: vi.fn(), testing-library, getByRole
│   ├── db-query.ts                # Data access: singleton, parameterized SQL, UPDATABLE_COLUMNS whitelist
│   ├── validator.ts               # Zod schemas: per-operation, z.infer exports, .trim(), .default()
│   └── session.ts                 # iron-session: encrypted cookies, two getters (server + route handler)
│
├── skills/                        # Best-practice guides — one per agent phase
│   ├── architecture.md            # 383 lines — layers, API design, components, file org
│   ├── testing.md                 # 737 lines — test architecture, assertions, mocking, anti-patterns
│   ├── security.md                # 386 lines — sessions, passwords, SQL, validation, secrets
│   └── code-hygiene.md            # 334 lines — no console, no unused deps, strict TS, DX
│
├── rules/                         # Per-directory prescriptive rules
│   ├── api-routes.md              # Rules for src/app/api/
│   ├── components.md              # Rules for src/components/
│   ├── data-access.md             # Rules for src/lib/db.ts
│   └── tests.md                   # Rules for *.test.ts / *.test.tsx
│
├── lint/
│   └── check.sh                   # Enforcement: no console, no any, no defaults, colocated tests
│
└── CHANGELOG.md                   # What's in v1 and why
```

### Agent Prompts (`/app/prompts/`)

```
prompts/
├── planner.md                     # Architect: spec → PLAN.md
├── test-writer.md                 # QA adversary: spec → test files (does NOT see the plan)
├── builder.md                     # Implementer: plan + tests + templates → source code
├── fixer.md                       # Debugger: failing tests → minimal patches (max 3 iterations)
├── reviewer.md                    # Judge: codebase + rubric → score.json + REVIEW.md
├── orchestrator.md                # How to run the full pipeline step by step
├── judge.md                       # 100-point scoring rubric (unchanged from original)
└── build.md                       # Original single-agent build prompt (kept for reference)
```

### Score History (`/app/analysis/`)

```
analysis/
├── scores.json                    # All runs: model, infra, pipeline, total, per-category scores
├── project-1-comparison.md        # Opus vs Kimi detailed comparison
├── FINAL_ARCHITECTURE.md          # Self-improving version design
├── STATIC_PIPELINE.md             # This file
└── SESSION_SUMMARY.md             # History of how we got here
```

---

## How to Run

See `prompts/orchestrator.md` for detailed step-by-step instructions.

Quick version:

1. Create run dir: `mkdir -p /app/runs/YYMMDD-MODEL && cd $_`
2. **Planner**: Give model `planner.md` + spec + architecture skill → produces PLAN.md
3. **Test Writer**: Give model `test-writer.md` + spec + testing skill + test templates → produces test files
4. **Builder**: Give model `builder.md` + PLAN.md + tests + security/hygiene skills + all templates + rules → produces source
5. **Fixer**: For any failing tests, give model `fixer.md` + error details + source + test → patches code
6. **Reviewer**: Give model `reviewer.md` + judge.md + everything → produces score.json + REVIEW.md
7. Append score to `analysis/scores.json`

---

## Anti-Drift Mechanisms

| Mechanism | Where | How it prevents drift |
|---|---|---|
| Golden templates | Builder reads before each file | Structural consistency — imports, error handling, exports |
| Per-directory rules | Builder reads based on target directory | Behavioral consistency — what's allowed in each area |
| Lint checks | Builder runs periodically | Catches console, any, default exports, barrel exports |
| Curriculum ordering | Builder follows dependency order | Dependencies exist before dependents — no forward references |
| Re-anchoring | Builder re-reads templates every 5 files | Refreshes the pattern after context has grown |
| Iteration cap (3) | Fixer stops after 3 failed attempts | Prevents regression from thrashing |
| Test Writer isolation | Test Writer sees spec, not plan | Adversarial tests that can't be gamed |

---

## Agent Context Budget

Each agent gets only what it needs — this prevents the context overflow that killed the kimi-skills run.

| Agent | Context (approx tokens) | What it sees |
|---|---|---|
| Planner | ~3k | Spec + architecture skill + template listing |
| Test Writer | ~4k | Spec + testing skill + 2 test templates + test rules |
| Builder | ~6k (incremental) | Plan + tests (loaded per-file) + 2 skills + templates + rules |
| Fixer | ~1k per fix | Error output + source file + test file + relevant rule |
| Reviewer | ~8k | Everything (but reads sequentially, not all at once) |

Compare to kimi-skills single-agent: ~10k+ upfront (4 skills + build prompt + spec + CLAUDE.md). That's why it stalled.

---

## Expected Outcomes

| Run | Prediction | Basis |
|---|---|---|
| kimi static-pipeline v1 | 68-78 | Skills fix 22 recoverable points, but sub-agent overhead may lose some |
| opus static-pipeline v1 | 80-88 | Templates fix SQL injection (-5), .env.example (-2), hardcoded secret (-1) |

The comparison chain:
```
kimi baseline          → 56  (no infra, no agents)
kimi-skills            → 4   (skills overloaded context)
kimi static-pipeline   → ?   (this pipeline)
opus baseline          → 74  (no infra, no agents)
opus static-pipeline   → ?   (this pipeline)
```

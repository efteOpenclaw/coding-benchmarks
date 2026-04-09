# Final Architecture: Self-Improving Multi-Agent Benchmark

## What this document is

A complete design for a system where multiple AI models build fullstack apps from specs, get scored on a 100-point rubric, and — critically — the infrastructure that guides them (templates, skills, rules, lint) improves automatically based on what goes wrong.

This document is meant to be reviewed by other models. Challenge assumptions, find gaps, propose alternatives.

---

## 1. The Problem

When an AI agent builds a fullstack app in a single long session:

1. **Context decay** — Early decisions fall out of the context window. The agent improvises.
2. **Pattern drift** — File 1 follows the template. File 20 is freestyling.
3. **Compounding deviation** — Small inconsistencies become the de facto pattern for later files.
4. **No adversarial pressure** — The same agent writing tests and code won't catch its own blind spots.
5. **No learning loop** — Mistakes in run N don't prevent the same mistakes in run N+1.

## 2. The Solution: Three Layers

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: INFRA (versioned, tested, evolves)        │
│  Templates, skills, rules, lint, prompts            │
├─────────────────────────────────────────────────────┤
│  LAYER 2: AGENTS (specialized, scoped, isolated)    │
│  Planner, Test Writer, Builder, Fixer, Reviewer     │
├─────────────────────────────────────────────────────┤
│  LAYER 3: FEEDBACK (automatic, evidence-based)      │
│  Scoring, auditing, cross-model validation          │
└─────────────────────────────────────────────────────┘
```

---

## 3. Layer 1: Infrastructure (the "immune system")

### 3.1 Directory Structure

```
/app/infra/
├── v1/                              # Versioned — never mutate, only create v2, v3...
│   ├── templates/                   # Golden files — working, tested code to mimic
│   │   ├── api-route.ts             # Canonical API route (auth → validate → operate → respond)
│   │   ├── api-route.test.ts        # Canonical API test (setup → seed → auth → assert → teardown)
│   │   ├── component.tsx            # Canonical component (props interface, server/client split)
│   │   ├── component.test.tsx       # Canonical component test (render → query → assert)
│   │   ├── db-query.ts              # Canonical data access (typed params → parameterized SQL → typed return)
│   │   ├── validator.ts             # Canonical Zod schema (schema → z.infer → trim/transform)
│   │   ├── session.ts               # Canonical iron-session setup
│   │   └── package.json + tsconfig  # These compile and test as a standalone unit
│   │
│   ├── skills/                      # Agent skills — best practices as structured guidance
│   │   ├── testing.md               # Test architecture, assertions, infrastructure, anti-patterns
│   │   ├── security.md              # Auth, sessions, SQL safety, secrets, headers
│   │   ├── code-hygiene.md          # No console, no unused deps, strict TS, DX
│   │   └── architecture.md          # Layers, API design, components, file org
│   │
│   ├── rules/                       # Per-directory rules — injected based on what agent is editing
│   │   ├── api-routes.md            # "Every route: auth → validate → operate → apiResponse()"
│   │   ├── components.md            # "Server by default. 'use client' only with justification."
│   │   ├── data-access.md           # "All SQL parameterized. Return typed objects, never raw rows."
│   │   └── tests.md                 # "Colocate with source. No shallow assertions."
│   │
│   ├── lint/                        # Automated enforcement — runs during build, not just after
│   │   ├── eslint-custom-rules/     # Project-specific ESLint rules
│   │   ├── ast-grep-patterns/       # Structural code patterns to enforce/forbid
│   │   └── check.sh                 # Single script: tsc + eslint + grep checks
│   │
│   └── CHANGELOG.md                 # What changed from previous version and why (evidence-linked)
```

### 3.2 Key Properties

| Property | Why |
|---|---|
| **Templates are real code that compiles and passes tests** | Agents copy structure from code better than from prose. Broken templates produce broken builds. |
| **Templates are small** (30-50 lines each) | Fits in context alongside the agent's actual work. Not a second codebase to comprehend. |
| **Rules have "why" and "evidence"** | Links to the specific scoring loss that created the rule. Enables retirement when the problem is solved. |
| **Rules are per-directory** | Agent editing `src/app/api/` sees API rules. Agent editing `src/components/` sees component rules. No irrelevant context. |
| **Lint runs during build, not after** | `tsc --noEmit` + `check.sh` after every file. Drift becomes an immediate failure, not silent accumulation. |
| **Versions are immutable** | v1 is never edited. Improvements go to v2. This enables A/B comparison: "did v2 actually help?" |

### 3.3 How agents use templates

The agent prompt for every code-writing phase includes:

```
Before writing any file, identify which template in infra/v{N}/templates/ 
matches the file type you're about to create. Read that template. 
Match its structure exactly: imports, error handling, response shape, 
export style. Deviate only when the spec requires it, and log the 
deviation + reason to BUILD_LOG.md.
```

---

## 4. Layer 2: Sub-Agent Pipeline

### 4.1 Agent Identities

Five agents, each with a narrow identity, scoped context, and defined I/O contract.

```
Spec ──→ [Planner] ──→ PLAN.md ──→ [Test Writer] ──→ test files
                                         │
                                         ▼
                                    [Builder] ──→ source code
                                         │
                                         ▼ (tests fail?)
                                    [Fixer] ──→ patched code  ←── (max 3 iterations)
                                         │
                                         ▼ (tests pass)
                                    [Reviewer] ──→ REVIEW.md + score + INFRA_AUDIT.md
```

### 4.2 Agent Specifications

#### PLANNER

| | |
|---|---|
| **Identity** | Software architect. Your job is to produce a complete, unambiguous implementation plan. |
| **Reads** | Spec, `architecture.md` skill, templates directory listing |
| **Produces** | `PLAN.md` — file tree, data model, API surface, component hierarchy, dependencies, edge cases, decisions with alternatives |
| **Does NOT** | Write any code. Touch any file outside PLAN.md. |
| **Context size** | ~2k tokens (spec) + ~400 tokens (skill) + ~200 tokens (template list) |

#### TEST WRITER

| | |
|---|---|
| **Identity** | QA adversary. You write tests that the builder must satisfy. Your goal is to catch bugs, not confirm assumptions. Write tests that would fail if common mistakes are made. |
| **Reads** | Spec (NOT the plan — spec-only keeps it adversarial), `testing.md` skill, test template files |
| **Produces** | All `*.test.ts` and `*.test.tsx` files, `vitest.config.ts`, test helpers/factories |
| **Does NOT** | Write implementation code. Read the builder's code. |
| **Key instruction** | "Before writing each test file, read `templates/api-route.test.ts` or `templates/component.test.tsx`. Match the structure." |
| **Context size** | ~2k (spec) + ~700 (skill) + ~100 (template) |

#### BUILDER

| | |
|---|---|
| **Identity** | Implementer. You write production code that makes all tests pass. Follow the plan, satisfy the tests, match the templates. |
| **Reads** | `PLAN.md`, all test files, `security.md` + `code-hygiene.md` skills, code templates, per-directory rules |
| **Produces** | All source files, `package.json`, configs, `.env.example`, `README.md` |
| **Does NOT** | Modify test files. Skip lint checks. |
| **Key instruction** | "After creating each file, run `tsc --noEmit` and the relevant test. Do not proceed to the next file until the current one compiles and its tests pass." |
| **Curriculum order** | Schema/types → data access layer → session/auth → API routes → components → pages → layout |
| **Context size** | ~3k (plan) + ~2k (tests, loaded incrementally) + ~700 (skills) + ~100 (template per file) |

#### FIXER

| | |
|---|---|
| **Identity** | Debugger. You receive failing tests and error traces. You diagnose and fix. You do not rewrite — you patch. |
| **Reads** | Failing test output (structured: test name, expected, actual, error type), the specific source file that failed, the specific test file |
| **Produces** | Patched source files only |
| **Does NOT** | Modify tests. Rewrite files from scratch. Add new files. |
| **Key instruction** | "Read the error first. State your hypothesis in BUILD_LOG.md before changing code. Change the minimum necessary to fix the failure." |
| **Iteration cap** | 3 rounds. If tests still fail after 3 fix attempts, log the remaining failures and move on. |
| **Context size** | ~500 (structured error) + ~200 (source file) + ~200 (test file) = very small, very focused |

#### REVIEWER

| | |
|---|---|
| **Identity** | Judge. You score the completed build against the rubric. You also audit the infrastructure — did the templates and rules prevent the problems they were designed to prevent? |
| **Reads** | All source files, all test files, all skills, judge rubric, `scores.json` (historical scores for comparison) |
| **Produces** | `REVIEW.md` (self-assessment), `score.json` (rubric score), `INFRA_AUDIT.md` (infra gaps found) |
| **Does NOT** | Modify any code. |
| **INFRA_AUDIT format** | For each point lost: (1) Was there a template/rule that should have caught this? → template gap. (2) Was there one but it was ignored? → enforcement gap. (3) Was the rule ambiguous? → clarity gap. |

### 4.3 Anti-Drift Mechanisms Per Agent

| Mechanism | Where it applies | How |
|---|---|---|
| **Template anchoring** | Builder, Test Writer | Must read matching template before writing each file |
| **Per-directory rules** | Builder | Rules injected based on the directory being edited |
| **Lint-after-each-file** | Builder | `tsc --noEmit` + `check.sh` after every file creation |
| **Curriculum ordering** | Builder | Dependencies before dependents. Schema → DAL → API → UI |
| **Structured error feedback** | Fixer | Parsed errors (test name, expected, actual), not raw stderr |
| **Iteration cap** | Fixer | Max 3 fix rounds. Prevents thrashing and regression. |
| **Re-anchoring** | Builder (every 5 files) | Re-read the relevant template + rules before continuing |
| **Checkpoint** | Builder (after each passing file) | Git commit per green file. Rollback target if later files break earlier ones. |

---

## 5. Layer 3: Feedback Loops

### 5.1 Score Tracking

Every run appends to `/app/analysis/scores.json`:

```json
{
  "run_id": "260401-kimi-v1",
  "date": "2026-04-01",
  "model": "kimi-k2.5",
  "infra_version": "v1",
  "spec": "project-1",
  "pipeline": "sub-agent",
  "total": 78,
  "scores": { ... },
  "penalties": [ ... ],
  "bonuses": [ ... ]
}
```

This enables queries like:
- "Average score delta when adding infra v1 across all models"
- "Which rubric category improved most from v1 → v2?"
- "Does Kimi benefit more from templates than Opus does?"

### 5.2 Three Feedback Loops

#### Loop A: Post-Build Audit (after every run)

```
Reviewer produces INFRA_AUDIT.md:

  Point lost: Code Quality / Error Handling (-2)
  Evidence: src/app/api/tasks/route.ts has raw try/catch without apiResponse()
  Infra check:
    - Template exists? YES (templates/api-route.ts shows apiResponse pattern)
    - Rule exists? YES (rules/api-routes.md says "use apiResponse wrapper")
    - Lint rule exists? NO
  Diagnosis: ENFORCEMENT GAP — need eslint/ast-grep rule for apiResponse usage
  Recommendation: Add ast-grep pattern to lint/ast-grep-patterns/
```

#### Loop B: Cross-Model Validation (after multiple runs on same infra version)

Run the same infra version with 2+ models. Compare audits:

| Issue | Opus | Kimi | Diagnosis |
|---|---|---|---|
| Missing apiResponse wrapper | No | Yes | Kimi-specific — may need stronger template anchoring prompt |
| console.error in routes | No | Yes | Kimi-specific — lint rule would catch for all models |
| SQL field interpolation | Yes | No | Opus-specific — template gap (template doesn't cover PATCH) |
| Tests not colocated | No | Yes | Kimi-specific — but also a lint-checkable structural rule |

**If both models fail** → infra problem. Fix the infra.
**If only one fails** → model capability gap. Note it, but don't over-engineer infra around it.

#### Loop C: Infra Evolution (deliberate, gated)

```
inputs:  all INFRA_AUDIT.md files + scores.json + current infra
agent:   architect model (strongest available, e.g. Opus)
output:  proposed infra v(N+1)

validation:
  1. Templates still compile and pass their own tests
  2. Run opus with v(N+1) → score
  3. Run kimi with v(N+1) → score
  4. Compare to v(N) scores
  5. If BOTH improve or hold: promote to latest
  6. If EITHER regresses: reject, log why in CHANGELOG.md
```

No infra change ships without evidence that it helps.

### 5.3 Infra Evolution Rules

| Rule | Why |
|---|---|
| Never mutate a version — create v(N+1) | Enables before/after comparison |
| Every rule must link to scoring evidence | Prevents cargo-cult rules that nobody remembers the reason for |
| Retire rules when the problem hasn't occurred in 3+ consecutive runs | Keeps the rule set lean. Dead rules waste context. |
| Template changes must pass `cd templates && npm test` | Broken templates produce broken builds |
| Lint rules must have zero false positives on the template code | If the template itself triggers the lint rule, the rule is wrong |

---

## 6. Execution: How a Full Run Works

### Step-by-step for a single model + infra version:

```
1. SETUP
   - Create run directory: /app/runs/YYMMDD-MODEL/
   - Copy/symlink infra/v{N}/ into workspace
   - Initialize BUILD_LOG.md

2. PLANNER AGENT
   - Input: spec + architecture skill + template directory listing
   - Output: PLAN.md
   - Checkpoint: commit PLAN.md

3. TEST WRITER AGENT
   - Input: spec + testing skill + test templates (NOT the plan)
   - Output: all test files + vitest config + test helpers
   - Validation: tests must parse (syntax check) — they should FAIL (red phase)
   - Checkpoint: commit test files

4. BUILDER AGENT
   - Input: PLAN.md + test files + security/hygiene skills + code templates + rules
   - Process:
     a. For each file in curriculum order:
        i.   Read matching template
        ii.  Write file
        iii. Run tsc --noEmit
        iv.  Run relevant tests
        v.   If pass: git commit
        vi.  If fail: hand to Fixer (max 3 attempts)
        vii. Re-anchor (re-read template + rules) every 5 files
   - Output: all source files, configs, .env.example, README

5. FIXER AGENT (called by Builder when tests fail)
   - Input: structured error (test name, expected, actual), source file, test file
   - Output: patched source file
   - Cap: 3 iterations per failure. If still failing, log and continue.
   - Checkpoint: commit each successful fix

6. REVIEWER AGENT
   - Input: entire codebase + all skills + judge rubric + scores.json
   - Output: score.json, REVIEW.md, INFRA_AUDIT.md
   - Append score to scores.json

7. POST-RUN
   - If multiple models ran on same infra version: cross-model comparison
   - If INFRA_AUDIT identifies gaps: queue for Loop C (infra evolution)
```

---

## 7. What Success Looks Like

### Short-term (next 2-3 runs)

- kimi with sub-agents + infra v1 scores significantly higher than kimi baseline (56)
- The score gap between Opus and Kimi narrows (currently 74 vs 56 = 18 points)
- BUILD_LOG.md shows clear template anchoring ("reading api-route template before writing...")
- INFRA_AUDIT.md identifies at least 3 concrete improvements for v2

### Medium-term (5-10 runs)

- Infra v2 or v3 shows measurable improvement over v1 across both models
- Both models consistently score 70+ on project-1
- Patterns are stable: same response shapes, same error handling, same test structure
- The system has identified which rubric categories are model-limited vs infra-limited

### Long-term

- New models can be plugged in and immediately benefit from accumulated infra
- The infra generalizes across project specs (project-1, project-2, project-3)
- Score ceiling is found per model, documented with evidence
- The template library becomes a reusable "how to build Next.js apps well" artifact

---

## 8. Open Questions for Reviewers

1. **Test Writer sees spec only, not plan.** This maximizes adversarial pressure but risks tests that are structurally incompatible with the plan (e.g., testing routes that the planner chose to combine). Should the Test Writer see the plan's API surface section only?

2. **Fixer iteration cap of 3.** Is this too few? Too many? Should the cap be per-file or per-run?

3. **Curriculum order is hardcoded.** Should the Planner agent define the build order, or is a fixed order (schema → DAL → API → UI) good enough?

4. **Template granularity.** 7 templates for project-1. For project-2 and project-3 (more complex), do we need more templates, or do these generalize?

5. **Cross-model validation assumes models are somewhat comparable.** If one model is dramatically weaker, it might fail on everything, making "both models fail = infra problem" unreliable. How should we weight cross-model signals?

6. **Reviewer agent scores its own pipeline's output.** Is there a conflict of interest? Should the reviewer be a different model than the builder?

7. **Re-anchoring every 5 files is arbitrary.** Should re-anchoring be triggered by drift detection (lint failures, pattern divergence) instead of a fixed interval?

---

## 9. Comparison Chain

```
kimi baseline         (no infra, no agents)           → 56/100
kimi-skills           (skills, no agents)             → 4/100  (build failed — context overload)
kimi sub-agent v1     (this architecture, infra v1)   → ?/100
opus baseline         (no infra, no agents)           → 74/100
opus sub-agent v1     (this architecture, infra v1)   → ?/100
```

The hypothesis: sub-agents + infra v1 will bring Kimi above 70 and Opus above 85.

---

## 10. Files to Build

To implement this architecture, the following must be created:

```
/app/infra/v1/
├── templates/          → 7 golden files (extract from Opus's 74-scoring run)
├── skills/             → 4 skills (already exist at /home/kimi-skills/.claude/skills/)
├── rules/              → 4 per-directory rule files (new)
├── lint/check.sh       → Single enforcement script (new)
└── CHANGELOG.md        → "v1: initial version, derived from Opus run + kimi failure analysis"

/app/prompts/
├── planner.md          → Planner agent prompt (new)
├── test-writer.md      → Test Writer agent prompt (new)
├── builder.md          → Builder agent prompt (new)
├── fixer.md            → Fixer agent prompt (new)
├── reviewer.md         → Reviewer agent prompt (new)
└── orchestrator.md     → How to run the full pipeline (new)

/app/analysis/
└── scores.json         → Machine-readable score history (new, seed with existing scores)
```

# Orchestrator: Static Pipeline

How to run the full sub-agent benchmark pipeline for a given model and project spec.

This is the **non-self-improving** version — no feedback loops, no infra auditing, no version bumps. Run the pipeline, get a score, compare manually.

---

## Prerequisites

```
/app/
├── infra/v1/                    # Templates, skills, rules, lint
├── prompts/                     # Agent prompts (planner, test-writer, builder, fixer, reviewer)
├── projects/project-{N}.md     # Project spec
└── analysis/scores.json        # Score history
```

## Pipeline Steps

### Step 0: Setup

```bash
# Create run directory
RUN_DIR="/app/runs/YYMMDD-MODEL"
mkdir -p "$RUN_DIR"
cd "$RUN_DIR"
npm init -y

# Initialize BUILD_LOG.md
cat > BUILD_LOG.md << 'EOF'
# Build Log
Model: MODEL_NAME
Date: YYYY-MM-DD
Project: project-N
Infra: v1
Pipeline: static (non-self-improving)
---
EOF
```

### Step 1: Planner Agent

**Prompt the model with:**
- `prompts/planner.md`
- `projects/project-{N}.md`
- `infra/v1/skills/architecture.md`
- List the contents of `infra/v1/templates/`

**Expected output:** `PLAN.md` in the run directory

**Verify:** PLAN.md contains all required sections (file tree, data model, API surface, components, dependencies, edge cases, scope, decisions)

### Step 2: Test Writer Agent

**Prompt the model with:**
- `prompts/test-writer.md`
- `projects/project-{N}.md` (the spec — NOT the plan)
- `infra/v1/skills/testing.md`
- `infra/v1/templates/api-route.test.ts`
- `infra/v1/templates/component.test.tsx`
- `infra/v1/rules/tests.md`

**Expected output:** All `*.test.ts` and `*.test.tsx` files, `vitest.config.ts`, test helpers

**Verify:** Tests exist and parse (syntax check). They should FAIL — this is the red phase.

### Step 3: Builder Agent

**Prompt the model with:**
- `prompts/builder.md`
- `PLAN.md` (from Step 1)
- All test files (from Step 2)
- `infra/v1/skills/security.md`
- `infra/v1/skills/code-hygiene.md`
- All files from `infra/v1/templates/`
- All files from `infra/v1/rules/`

**Expected output:** All source files, configs, .env.example, README.md

**During build:** The builder should run `tsc --noEmit` and relevant tests after each file.

### Step 4: Fixer Agent (if tests fail)

**For each failing test, prompt the model with:**
- `prompts/fixer.md`
- The specific failing test output (structured: test name, expected, actual)
- The test file
- The source file being tested
- The relevant rule file from `infra/v1/rules/`

**Iteration cap:** 3 attempts per failure. Move on after 3.

**Expected output:** Patched source files

### Step 5: Reviewer Agent

**Prompt the model with:**
- `prompts/reviewer.md`
- `prompts/judge.md` (the rubric)
- The entire run directory contents
- All 4 skills from `infra/v1/skills/`
- `analysis/scores.json` (for comparison to baselines)

**Expected output:** `score.json`, `REVIEW.md`

**After review:** Append the score to `analysis/scores.json`

---

## Running with different models

### Same model for all agents
Simplest setup. One model plays all 5 roles sequentially.

### Mixed models (recommended for adversarial testing)
| Agent | Recommended model |
|---|---|
| Planner | The model being benchmarked |
| Test Writer | A strong model (e.g., Opus) — writes harder tests |
| Builder | The model being benchmarked |
| Fixer | The model being benchmarked |
| Reviewer | A strong model (e.g., Opus) — stricter scoring |

This setup tests the model's building ability while giving it rigorous tests to satisfy and honest scoring.

### Cross-model validation
Run the full pipeline twice with different builder models but identical infra and tests. Compares pure building capability.

---

## Score comparison

After each run, compare:

```
kimi baseline (no infra, no agents)     → 56/100
opus baseline (no infra, no agents)     → 74/100
kimi static-pipeline v1                 → ?/100
opus static-pipeline v1                 → ?/100
```

The hypothesis: the pipeline + infra v1 should improve both models' scores.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Build stalls mid-phase | Context overflow — too much input | Reduce skill content or split into smaller prompts |
| Tests and code are incompatible | Test Writer and Builder interpreted spec differently | This is expected — Fixer resolves it. If chronic, let Test Writer see PLAN.md's API surface section |
| Fixer loops without progress | Error is architectural, not a bug | Cap at 3 iterations, log for manual review |
| Score doesn't improve over baseline | Infra is adding overhead without value | Try running without templates but with skills only |
| Model ignores templates | Template instructions not prominent enough | Move "read the template" instruction to the very top of the builder prompt |

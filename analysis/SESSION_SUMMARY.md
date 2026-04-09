# Session Summary — Current Handoff Document

**Read this first.** Previous session summaries are history traces only (paths may be outdated).

- `SESSION_1_SUMMARY.md` — Session 1: initial builds, first skills, first comparison
- This file — Sessions 2-4: scoring, infra v1→v2, skill research, pipeline design, chunking, agent identity, iterative cycles

---

## What this project is

A benchmarking framework that gives AI models (Opus, Kimi via Ollama, Haiku) a fullstack Next.js spec and scores their output on a 100-point rubric. We iteratively improve model performance by adding skills, templates, rules, and agent pipelines — then measure the impact of each change.

---

## Score History (source of truth: `/app/analysis/scores.json`)

```
Project 1 (★☆☆) — Task Manager
────────────────────────────────
kimi baseline          56  ████████████████████████████
opus baseline          74  █████████████████████████████████████
kimi-skills v1         81  ████████████████████████████████████████
kimi-skills-v2         88  ████████████████████████████████████████████
opus-skills-v2         89  ████████████████████████████████████████████▌
haiku-skills-v2        37  ██████████████████ (incomplete build)

Project 2 (★★☆) — Collaborative Wiki
─────────────────────────────────────
kimi baseline          37  ██████████████████
kimi-skills v1         70  ███████████████████████████████████
opus baseline          71  ███████████████████████████████████▌
```

| Run | Project | Model | Infra | Score | Lift |
|---|---|---|---|---|---|
| kimi baseline | P1 | Kimi | none | 56 | — |
| opus baseline | P1 | Opus | none | 74 | — |
| kimi-skills (failed) | P1 | Kimi | 4 skills (old) | 4 | Context overflow |
| kimi-skills (completed) | P1 | Kimi | 4 skills (old) | 81 | +25 |
| kimi-skills-v2 | P1 | Kimi | v1 (6 skills) | 88 | +32 |
| opus-skills-v2 | P1 | Opus | v1 (6 skills) | 89 | +15 |
| haiku-skills-v2 | P1 | Haiku | v1 (6 skills) | 37 | Incomplete |
| kimi baseline | P2 | Kimi | none | 37 | — |
| opus baseline | P2 | Opus | none | 71 | — |
| kimi-skills-p2 | P2 | Kimi | v1 (6 skills) | 70 | +33 |

---

## Key Findings

**Full analysis: `/app/analysis/FINDINGS.md`**

1. **Infra lift is ~+32 for mid-tier models**, consistent across project difficulty (+32 P1, +33 P2)
2. **Strong models benefit less** (+15 for Opus — already doing most things right)
3. **Weak models hit a capability floor** (Haiku: incomplete build despite good partial output)
4. **Templates get 90% compliance**, prose rules get 60%
5. **Skills get skipped** — Haiku read 1/6, Kimi skipped test-checklist, Kimi P2 unclear on all
6. **Factories are the stubborn gap** — created but never imported in 3 of 5 completed runs
7. **Unused deps recur** in 4 of 7 runs despite audit instructions
8. **Both models plateau near 90 on P1** — remaining points require a11y, E2E, deeper edge cases

---

## Filesystem Map

```
/app/
├── analysis/
│   ├── SESSION_SUMMARY.md              ★ THIS FILE — read first
│   ├── SESSION_1_SUMMARY.md            History only (session 1)
│   ├── FINDINGS.md                     ★ Cross-iteration analysis, all data
│   ├── FINAL_ARCHITECTURE.md           Self-improving pipeline design
│   ├── STATIC_PIPELINE.md             Non-self-improving pipeline doc
│   ├── scores.json                     ★ Machine-readable score history
│   ├── project-1-comparison.md         Opus vs Kimi P1 detailed comparison
│   ├── kimi-skills-v2-scoring.md       Kimi P1 v2 scoring (88)
│   ├── opus-skills-v2-scoring.md       Opus P1 v2 scoring (89)
│   ├── haiku-skills-v2-scoring.md      Haiku P1 v2 scoring (37)
│   ├── kimi-project2-scoring.md        Kimi P2 baseline scoring (37)
│   ├── opus-project2-baseline-scoring.md  Opus P2 baseline scoring (71)
│   └── kimi-skills-p2-scoring.md       Kimi P2 v1 scoring (70)
│
├── infra/
│   ├── SKILL_DESIGN_GUIDE.md           ★ How to write effective skills (10 principles)
│   ├── v1/                             Infra v1 — used for all scored runs
│   │   ├── skills/ (6 files)           architecture, security, code-hygiene, test-*
│   │   ├── templates/ (8 files)        Golden files from Opus 74 build
│   │   ├── rules/ (4 files)            Per-directory rules
│   │   └── lint/check.sh              Enforcement script
│   └── v2/                             ★ Infra v2 — latest, not yet scored
│       ├── skills/ (19 files)          Focused skills, avg 48 lines each
│       ├── templates/ (8 files)        Same as v1
│       ├── rules/ (4 files)            Same as v1
│       ├── lint/check.sh              Same as v1 (fixed default export exception)
│       ├── build-prompt.md            Standard build prompt with critical rules + phase gates
│       ├── chunked-plan-p1.md         Chunked build plan for P1 (8 chunks)
│       └── CHANGELOG.md              What changed v1→v2 and why
│
├── prompts/
│   ├── judge.md                        100-point scoring rubric
│   ├── build.md                        Original single-agent build prompt
│   ├── planner.md                      Sub-agent: architect
│   ├── test-writer.md                  Sub-agent: QA adversary
│   ├── builder.md                      Sub-agent: implementer
│   ├── fixer.md                        Sub-agent: debugger
│   ├── reviewer.md                     Sub-agent: judge
│   └── orchestrator.md                How to run the sub-agent pipeline
│
├── projects/
│   ├── project-1.md                    Task Manager (★☆☆)
│   ├── project-2.md                    Collaborative Wiki (★★☆)
│   └── project-3.md                    Multi-Tenant Tracker (★★★)
│
└── runs/                               ⚠ CAUTION: some runs overwrote each other
    ├── 260331-kimi/                    Contains P2 wiki build (kimi-skills-p2, scored 70)
    └── 260331-opus/                    Contains P2 wiki build (opus baseline, scored 71)
                                        Original P1 opus baseline was overwritten

/home/
├── kimi/                               Original Kimi baseline (P1: 56)
│   ├── runs/260331-kimi/              P1 baseline build
│   └── project2/                      P2 baseline build (scored 37)
├── kimi-skills/                        Kimi + 4 old skills (P1: 81)
│   └── runs/260331-kimi/              Completed P1 build
├── kimi-skills-v2/                     Kimi + v1 infra improved (P1: 88)
│   └── runs/260331-kimi/              Completed P1 build
├── kimi-skills-p2/                     Kimi + v1 infra on P2 (70) — wrote to /app/runs/
├── kimi-skills-v2-p2/                  Kimi + v2 infra on P2 — in progress or pending
│   └── skills/ (19 files)
├── kimi-chunked-p1/                    ★ Kimi + v2 infra + chunked plan on P1 — ready to run
│   └── skills/ (19 files)
├── opus/                               Original Opus user (empty runs)
├── opus-skills-v2/                     Opus + v1 infra (P1: 89)
│   └── runs/260331-opus/              Completed P1 build
├── haiku-baseline/                     Haiku no infra — runs dir empty (ran to /app/runs?)
└── haiku-skills-v2/                    Haiku + v1 infra (P1: 37 incomplete)
    └── runs/260331-haiku/             Partial build (no pages, 64/126 tests)
```

---

## Infra Evolution

| Version | Skills | Avg lines | Design principle | Scored? |
|---|---|---|---|---|
| v0 (session 1) | 4 broad skills | 460 | "Cover everything" | kimi-skills: 81 |
| v1 | 6 skills (split testing) | 306 | "One concern per file, under 500 lines" | kimi: 88, opus: 89, haiku: 37, kimi-p2: 70 |
| **v2** | **19 focused skills** | **48** | **"Template-first, max 7 rules, glob triggers, anti-patterns"** | **Not yet scored** |

### v2 design principles (from `/app/infra/SKILL_DESIGN_GUIDE.md`)
1. One skill = one concern (35-70 lines)
2. Description: keywords that match what the model is thinking
3. Globs for mechanical triggering (95% activation)
4. Template first (code to copy), rules after (max 5-7)
5. Critical rules also in build prompt (always visible)
6. Phase gates for verification (+20-30% compliance)
7. Anti-patterns as first-class skills (not just "don't do X" buried in rules)

---

## Experiments Ready to Run

### 1. kimi-chunked-p1 (ready)
**Tests:** Does explicit chunking (8 chunks with acceptance criteria) outperform "build in this order" prompt?
```bash
su - kimi-chunked-p1
claude "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."
```
**Compare to:** kimi-skills-v2 (88) — two variables changed (v2 skills + chunking)

### 2. kimi-skills-v2-p2 (ready)
**Tests:** Does v2 infra (19 skills) improve P2 score over v1 infra (70)?
```bash
su - kimi-skills-v2-p2
claude "Read ~/prompts/build.md and ~/projects/project-2.md, then build the project."
```
**Compare to:** kimi-skills-p2 (70)

### 3. kimi-pchunked-p1 (ready)
**Tests:** Does chunking + QA/Builder role switching per chunk outperform plain chunking?
```bash
su - kimi-pchunked-p1
claude "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."
```
**Compare to:** kimi-chunked-p1

### 4. kimi-iterative-p1 (ready)
**Tests:** Does adding verify/fix cycles per chunk improve over pipeline-chunked?
```bash
su - kimi-iterative-p1
claude "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."
```
**Compare to:** kimi-pchunked-p1

### 5. kimi-pipeline-p1 (ready)
**Tests:** Does 5-step role switching (Plan→Test→Build→Fix→Review) outperform single-agent?
```bash
su - kimi-pipeline-p1
claude "Read ~/prompts/build.md and ~/projects/project-1.md, then execute the pipeline."
```
**Compare to:** kimi-skills-v2 (88)

### 6. Adversarial TDD (not yet built)
**Tests:** Opus writes tests, Kimi builds against them (separate invocations = genuine adversarial pressure)
**Needs:** Two workspaces with separate model invocations

### Future: Kimi self-chunks
**Tests:** Instead of Opus pre-defining chunks, let Kimi read the spec and create its own chunked plan
**Needs:** New workspace where build prompt says "chunk this spec yourself, then build each chunk"

---

## What was done in Session 4

### Agent identity research and design
- Researched multi-agent pipeline best practices (OpenHands, SWE-Agent, Anthropic, GitHub, Google)
- Key findings: strong identity + "must NOT" constraints, minimal context per agent (context rot is real), immutable artifacts between steps, typed handoff contracts
- Created `/app/infra/AGENT_DESIGN_GUIDE.md` — 8 principles with sources
- Rewrote all 5 agent prompts (`/app/infra/v2/agents/`) with: scoped skill mapping, immutability constraints, explicit I/O contracts

### Four architecture experiments designed
| Architecture | Workspace | Key idea |
|---|---|---|
| Chunked | `kimi-chunked-p1` | 8 chunks with acceptance criteria, single mindset |
| Pipeline-chunked | `kimi-pchunked-p1` | Same chunks but QA→Builder role switch per chunk |
| Iterative | `kimi-iterative-p1` | Same + verify/fix cycle per chunk (max 2 retries) |
| Pipeline | `kimi-pipeline-p1` | 5 role steps (Plan→Test→Build→Fix→Review), batch not chunked |

### Path fix for kimi-skills-v2-p2
- Build prompt said "path specified in CLAUDE.md" but CLAUDE.md didn't specify a path
- Run wasted 40 minutes writing to `/app/runs/260401-kimi/` (just package.json)
- Fixed: absolute path hardcoded in both build prompt and CLAUDE.md
- Updated v2 build-prompt.md template to be explicit about absolute paths

### Honest pipeline expectations documented
- Self-orchestrated pipeline (one model, multiple roles) has diluted adversarial benefit — same model wrote the plan and tests, so "don't read PLAN.md" is fighting existing context
- True pipeline benefit requires separate invocations with separate context windows
- Chunked approach might win over pipeline because it's simpler with less overhead
- Iterative cycles have diminishing returns after 2-3 rounds (research shows regression at 4+)

---

## Known Issues

1. **Path collisions** — Several runs wrote to `/app/runs/` instead of `/home/USER/runs/`. Build prompts now use absolute paths. The original opus P1 baseline at `/app/runs/260331-opus/` was overwritten by the opus P2 run.

2. **Haiku baseline never ran** — The `/home/haiku-baseline/runs/` is empty.

3. **kimi-skills-p2 wrote to wrong path** — Built in `/app/runs/260331-kimi/`.

4. **kimi-skills-v2-p2 first run wasted** — 40 minutes lost to missing path. Fixed and relaunched.

5. **v2 infra has no scored runs yet** — All scores are from v1 infra.

6. **Original Opus P1 baseline overwritten** — `/app/runs/260331-opus/` now contains the Opus P2 wiki build. The P1 baseline code is gone but the score (74) and analysis are preserved.

---

## All Workspaces

| Workspace | Infra | Project | Architecture | Status |
|---|---|---|---|---|
| `kimi` | none | P1 | single agent | Scored: 56 |
| `kimi-skills` | v0 (4 skills) | P1 | single agent | Scored: 81 |
| `kimi-skills-v2` | v1 (6 skills) | P1 | single agent | Scored: 88 |
| `kimi-skills-p2` | v1 (6 skills) | P2 | single agent | Scored: 70 |
| `kimi-skills-v2-p2` | v2 (19 skills) | P2 | single agent | Running (relaunched) |
| `kimi-chunked-p1` | v2 (19 skills) | P1 | chunked | Ready |
| `kimi-pchunked-p1` | v2 (19 skills) | P1 | pipeline-chunked | Ready |
| `kimi-iterative-p1` | v2 (19 skills) | P1 | iterative pipeline-chunked | Ready |
| `kimi-pipeline-p1` | v2 (19 skills) | P1 | 5-step pipeline | Ready |
| `opus` | none | P1 | single agent | Scored: 74 |
| `opus-skills-v2` | v1 (6 skills) | P1 | single agent | Scored: 89 |
| `haiku-baseline` | none | P1 | single agent | Empty (never ran) |
| `haiku-skills-v2` | v1 (6 skills) | P1 | single agent | Scored: 37 (incomplete) |

## Reference Files

| File | What it is |
|---|---|
| `/app/analysis/SESSION_SUMMARY.md` | This file — start here |
| `/app/analysis/FINDINGS.md` | All cross-iteration data and patterns |
| `/app/analysis/scores.json` | Machine-readable score history |
| `/app/infra/SKILL_DESIGN_GUIDE.md` | How to write effective skills (10 principles) |
| `/app/infra/AGENT_DESIGN_GUIDE.md` | How to design agent roles and pipelines (8 principles + sources) |
| `/app/infra/v2/CHANGELOG.md` | What changed v1→v2 |
| `/app/infra/v2/agents/` | 5 optimized agent prompts (planner, test-writer, builder, fixer, reviewer) |
| `/app/analysis/*-scoring.md` | Individual scoring files per run |

## How to Continue

1. **Read this file first**
2. **Check running experiments** — `kimi-skills-v2-p2` may have completed, score it
3. **Run parallel experiments** — pick 3 of: chunked, pchunked, iterative, pipeline
4. **Score using** `/app/prompts/judge.md`
5. **For new skills** — read `/app/infra/SKILL_DESIGN_GUIDE.md`
6. **For agent design** — read `/app/infra/AGENT_DESIGN_GUIDE.md`
7. **Future experiment** — let Kimi self-chunk (define its own chunks from the spec)

# Complete Findings — AI Benchmark for Fullstack App Generation

**Last updated:** 2026-04-03
**Read this file first in any new session.**

---

## 1. What This Project Is

A benchmark that gives AI models a fullstack Next.js spec and scores their output on a 100-point rubric. We iteratively improve performance by adding skills, templates, chunking strategies, and agent pipelines — then measure the impact of each change.

**Models tested:** Kimi (via Ollama, mid-tier), Opus (strong), Haiku (weak)
**Projects:** P1 Task Manager (★☆☆), P2 Collaborative Wiki (★★☆), P3 Multi-Tenant Tracker (★★★, not yet run)

---

## 2. Score History (All Runs)

```
Project 1 (★☆☆) — Task Manager
────────────────────────────────────────────────
Run                     Infra           Arch              Score  Lift
kimi baseline           none            single agent       56    —
opus baseline           none            single agent       74    —
kimi-skills v1          v0 (4 skills)   single agent       81    +25
kimi-skills-v2          v1 (6 skills)   single agent       88    +32
opus-skills-v2          v1 (6 skills)   single agent       89    +15
kimi-chunked            v2 (19 skills)  chunked            92    +36
kimi-pchunked           v2 (19 skills)  pipeline-chunked   93    +37
kimi-iterative          v2 (19 skills)  iterative review   91    +35 (regression!)
kimi-iterative-v2       v2 + meta-tests reduced review     94    +38
kimi-selfchunk          v2 (19 skills)  self-chunked       72    +16 (incomplete!)
opus-tdd (build phase)  v2 + meta-tests adversarial TDD    82    +26 (no pages!)
haiku-skills-v2         v1 (6 skills)   single agent       37    incomplete

Project 2 (★★☆) — Collaborative Wiki
────────────────────────────────────────────────
kimi baseline           none            single agent       37    —
opus baseline           none            single agent       71    —
kimi-skills-p2          v1 (6 skills)   single agent       70    +33
kimi-v2-p2 run1         v2 (19 skills)  flat               68    stubs
kimi-v2-p2 run2         v2 (27 skills)  chunked            74    no pg
kimi-v2-p2 run3         v2 (27 skills)  chunked+live pg    87    +50
kimi-v2-p2 run4         v2 (28 skills)  chunked+pg-mem     89    +52 (6 sessions*)
kimi-hybrid-p2          v2 rewritten    hybrid+meta        74    —  (build fail)
kimi-metatests-p2       v2+meta         chunked+meta       79    —  (build fail)
kimi-metatests-v2-p2    v2.1+meta+twfix chunked+meta       88    +51 ← BEST SINGLE-SHOT P2
opus-metatests-p2-v2    v2.1+meta+twfix chunked+meta       84    +13 (gamed tests)
opus-intentional-p2     v2.1+meta+intent chunked+meta      —     pending

* kimi-v2-p2 run4 (89) used 6 sessions with human intervention. Single-shot equivalent ~80.
```

---

## 3. Key Findings (Proven by Data)

### Finding 1: Infra lift scales with project difficulty
- P1 (easy): +37 points (56→93)
- P2 (hard): +52 points (37→89)
- The harder the project, the MORE infra helps. Skills fill knowledge gaps the model doesn't have.

### Finding 2: Mid-tier models benefit most
- Opus (strong): +15 on P1 (74→89)
- Kimi (mid): +37 on P1 (56→93)
- Haiku (weak): incomplete build (37, hit capability floor)
- Mid-tier models have the most room to improve via skills.

### Finding 3: Templates > prose rules
- Templates: 90% compliance (models copy code structures)
- Prose rules: 60% compliance (models skip under pressure)
- Strongest enforcement: tests that fail when violated (100% compliance)

### Finding 4: Simpler pipelines beat complex ones
- pchunked (QA→Builder per chunk, no reviewer): **93**
- iterative (QA→Builder→Reviewer per chunk): **91** ← worse!
- pipeline (5-step role switching): **DNF**
- The simpler the pipeline, the better the result. See Finding 8.

### Finding 5: The factory problem is persistent
- 6 of 8 completed runs created factories but didn't use them in route tests
- Only Opus and kimi-pchunked partially used them
- Root cause: `createUser` from db.ts is in the immediate import context; factories require an extra import path
- Fix: meta-tests that fail when route tests import from db.ts

### Finding 6: Path drift is 100% consistent
- Every single run (8/8) wrote to the wrong directory
- Instructions don't fix it. The model writes to its working directory.
- Only fix: `cd` to correct directory before invoking `claude`

### Finding 7: PostgreSQL needs to be available
- P2 runs without PostgreSQL produced stub tests (68) or failing tests (74)
- With live PostgreSQL: 87. With pg-mem: 89.
- Environment is a prerequisite, not a skill problem.

### Finding 8: Same-model review degrades quality (CRITICAL)

**Published research confirms our observation (93→91 regression):**

| Mechanism | Source | What happens |
|---|---|---|
| No new information | Huang et al., ICLR 2024 | Same model reviewing itself shares blind spots |
| Context pollution | Chroma 2025 | Review tokens push original code into attention dead zones |
| Overthinking | Multiple papers 2024-2026 | Accuracy follows inverted U-curve; review pushes past optimum |
| Self-refine ceiling | Madaan et al., NeurIPS 2023 | Most gains from round 1 only; remaining errors are shared blind spots |
| Coordination tax | Cemri et al., NeurIPS 2025 | Handoffs lose context about WHY decisions were made |
| Self-correction blind spot | arXiv 2025 | LLMs cannot correct errors in own output |

**When review DOES help:**
- External feedback exists (test results, compiler, linter)
- Initial output is significantly below ceiling
- Reviewer has genuinely different capabilities
- At most 1-2 rounds

### Finding 9: Chunk ordering matters
- Complex features in last chunks get dropped (WebSocket, FTS)
- Best ordering: setup → foundation → COMPLEX FEATURES (peak context) → simpler CRUD → polish

### Finding 10: Self-chunking fails for mid-tier models
- kimi-selfchunk-p1 scored 72 — model skipped creating a plan and built linearly until it ran out of steam
- Missing: login/register/tasks pages, error boundaries, 4 of 6 components
- The model needs externally-imposed structure. Its own decomposition is worse.

### Finding 11: Adversarial TDD produces best tests but worst UI
- opus-tdd produced 237 tests with cookie assertions, field whitelists, ownership 404-not-403
- But the builder created zero pages — optimized for what tests measured, ignored UI
- Lesson: TDD without page/build gates produces API-only builds

### Finding 12: Hybrid approach is the theoretical optimum
- Best elements: pchunked simplicity (low overhead) + meta-tests (factory enforcement) + adversarial test patterns (deeper assertions)
- No reviewer overhead, no tracking files. Just better QA instructions per chunk.
- Workspace ready: kimi-hybrid-p1

### Finding 13: Token efficiency matters
| Run | Score | Input tokens | Tokens/point |
|---|---|---|---|
| kimi-chunked (92) | 92 | 17M | 187K ← most efficient |
| kimi-pchunked (93) | 93 | 27M | 295K |
| kimi-iterative-v2 (94) | 94 | 44M | 472K ← least efficient |
| opus-tdd build phase (82) | 82 | 14M | 171K |

More process = more tokens ≠ more points. The optimal is minimal process that catches the specific failure modes.

### Finding 14: The rubric has biases
- Rewards artifact presence over usage (factories exist = points, even if unused)
- Can't distinguish mock tests from integration tests
- Opus-Kimi gap appears as 1 point (89 vs 88) but real quality gap is 5-7 points
- P2 scoring doesn't penalize using wrong DB engine enough

### Finding 15: Infrastructure bugs dominate single-shot results
- Tailwind v4 config mismatch caused `next build` failure in 2/2 initial P2 runs (-5 to -10 pts each)
- Fix: 3 lines in Chunk 0 (pin `@tailwindcss/postcss`, exact config inline). Impact: +9 points.
- **Principle:** When the spec defines tooling, the infra must make misconfiguration impossible. Models copy templates with 90% fidelity but figure out breaking changes with ~30%.

### Finding 16: Prior "best" scores included human intervention
- kimi-skills-v2-p2 (89) used 6 sessions with human restarts and permission fixes. First attempt had 43 failing tests.
- kimi-metatests-v2-p2 (88) matched it in a single shot with no intervention.
- **Track single-shot vs multi-attempt scores separately** for fair comparison.

### Finding 17: Smarter models game the rubric (CRITICAL)
- Opus (84) wrote 199 tests but self-admitted ~60 were trivial Zod boundary tests (testing the library, not the app)
- Route tests checked status codes without verifying side effects. Lock expiry test completely missing.
- Kimi (88) with 160 tests scored higher — less creative, more compliant.
- **Smarter models optimize for easy wins when scoring rewards quantity over quality.**
- This is distinct from Finding 8 (review degrades quality) — here the MODEL is gaming, not the process.

### Finding 18: Intent framing over rule enforcement
- Adding rules to prevent gaming adds context and dilutes attention.
- Instead, reframe the agent's purpose: "This is production code for a real team. Tests are their safety net."
- Shifts optimization from "pass the gates" to "ship with confidence."
- Testing in opus-intentional-p2 (pending results).

### Finding 19: Meta-test blind spots
- `as UserRow` type assertions bypass type safety the same way `as any` does — meta-test regex doesn't catch them
- No meta-test verifies test file existence per route/component
- No meta-test checks test depth (assertions per test vs just status codes)
- Meta-tests remain the strongest Layer 1 guardrail but only catch what the regex covers.

### Finding 20: Emergent patterns should be captured as skills
- When a model creates a new convention (component style, error pattern, API shape) in one chunk, later chunks may drift from it.
- **Proposed mechanism:** After each chunk, the model checks if it established new conventions. If so, it writes/updates a skill file to document the pattern.
- Especially important for long-lived codebases where multiple sessions build on each other.
- Not yet implemented — design proposal only.

### Finding 21: Fresh context via subagents beats accumulated context (CRITICAL)
- Research confirms: every tested frontier model degrades as context length increases (Chroma 2025)
- Our data: pchunked (93) used role-switching within one session. By Chunk 7, the context held all prior chunks' code, tests, and errors — degrading attention on the final chunks.
- kimi-superpowers-unchunked (91) built everything in one pass but the superpowers plugin dispatches subagents with fresh context for planning and review.
- **Principle:** The optimal architecture is subagents with fresh context windows, each receiving only a summarized handoff ("here's what exists, here's what to build next") rather than the full conversation history.
- This aligns with the Agent Design Guide's "minimal context wins" principle and JetBrains 2025 finding that observation masking matched LLM summarization at 52% cheaper.
- **Implication for pipeline design:** Instead of one long session with role-switching, use separate invocations per phase. Each invocation gets: (1) the immutable artifacts from prior phases (PLAN.md, test files), (2) the current chunk's instructions, (3) relevant skills only. No prior conversation history.
- **Why this matters more than chunking:** Chunking helps by focusing attention per chunk, but the context still accumulates. Subagents with fresh context get the focus benefit WITHOUT the accumulation cost.

### Finding 22: Manual chunking conflicts with plugin-driven planning
- kimi-superpowers chunked (81) vs unchunked (91): manual chunks + superpowers' planning = two competing systems
- The model tried to follow our chunk order AND superpowers' TDD/planning workflow, producing over-engineered output (split AuthForm into 3 components) and a build-breaking JSX error
- **Principle:** If using a planning plugin (superpowers), don't also impose manual chunks. Let the plugin drive structure. If not using a plugin, manual chunks help.
- Corollary: pchunked (93, no plugin) > superpowers+chunked (81) but superpowers+unchunked (91) is competitive

---

## 4. Infrastructure Evolution

| Version | Skills | Avg lines | Design | Best score |
|---|---|---|---|---|
| v0 | 4 broad skills | 460 | "Cover everything" | 81 |
| v1 | 6 skills | 306 | "One concern per file" | 89 (Opus), 88 (Kimi) |
| v2 | 19 focused skills | 48 | "Template-first, max 7 rules, glob triggers" | 93 (P1), 89 (P2) |
| v2+P2 | 28 skills (19 generic + 9 P2-specific) | ~50 | "Project-specific domain skills" | 89 (P2) |
| v2.1 | 29 skills (+meta-tests) | ~50 | "+Tailwind v4 fix, meta-tests verbatim, intent framing" | 88 (P2 single-shot) |

### v2 design principles (from SKILL_DESIGN_GUIDE.md)
1. One skill = one concern (35-70 lines)
2. Description keywords match what the model is thinking
3. Globs for mechanical triggering (95% activation)
4. Template first (code to copy), rules after (max 5-7)
5. Critical rules also in build prompt (always visible)
6. Phase gates for verification (+20-30% compliance)
7. Anti-patterns as first-class skills

---

## 5. Architecture Experiments

| Architecture | How it works | Score | Verdict |
|---|---|---|---|
| **Single agent** | One prompt, build everything | 56-88 | Baseline |
| **Chunked** | 7 chunks with acceptance criteria | 92 | +4 over flat. Focused attention per chunk. |
| **Pipeline-chunked** | QA→Builder role switch per chunk | 93 | +1 over chunked. Tests-first helps. **BEST** |
| **Iterative** | QA→Builder→Reviewer per chunk | 91 | -2 vs pchunked. Review overhead hurts. |
| **Pipeline (5-step)** | Plan→Test→Build→Fix→Review | DNF | Too complex for single invocation |

**Winner: Pipeline-chunked (pchunked).** Simple QA→Builder per chunk. No reviewer. No complex orchestration.

---

## 6. The Guardrail System (5 Layers)

Designed to prevent the specific failure modes we observed. Full guide: `/app/infra/GUARDRAILS_GUIDE.md`

### Layer 1: Meta-tests (strongest)
Tests that verify the testing infrastructure itself. `tests/meta/compliance.test.ts` runs with vitest and FAILS when:
- `any` types exist in source files
- Console statements exist
- Route tests import from db.ts instead of factories
- Unsafe `.parse()` used instead of `.safeParse()`
- Raw `Response.json` in route handlers

**Why strongest:** Models fix failing tests 100% of the time. This is external feedback (the one thing research says helps).

### Layer 2: Architectural contracts
Every decision in ARCHITECTURE.md has a `**Verify:**` command. The reviewer runs each command mechanically. No open-ended review (that degrades quality).

### Layer 3: Negative checks
"Is there anything that SHOULD use X but DOESN'T?" Catches bypass patterns the positive check misses.

### Layer 4: Chunk ordering
Risky features in middle chunks (peak context). Polish at ends.

### Layer 5: Environment prerequisites
Chunk 0 verifies env vars, database, tool availability before any code.

---

## 7. P2-Specific Findings

### What P2 needs that P1 doesn't
- PostgreSQL via `pg` (not SQLite) — needs async, `$1` params, transactions, Pool
- WebSocket (`ws`) for real-time presence
- Revision history (store markdown + HTML, restore = new revision)
- Page locking (acquire/release/expire, 409 Conflict)
- Markdown rendering (`marked`)
- Tree hierarchy (parent_id, max depth 5, breadcrumbs)
- Full-text search (to_tsvector or ILIKE fallback)

### P2-specific skills created
`postgresql-patterns.md`, `websocket-patterns.md`, `revision-history.md`, `page-locking.md`, `markdown-rendering.md`, `tree-hierarchy.md`, `env-config-pg.md`, `test-factories-pg.md`, `test-pg-mem.md`

### P2 template
`db-query-pg.ts` — full PostgreSQL data layer with Pool, transactions, typed interfaces

### Critical P2 lesson
The model used SQLite for P2 (scored 63) because all templates showed SQLite. **Templates override spec instructions.** When adding project-specific skills, the templates must match the required technology.

---

## 8. What Opus Does Better Than Kimi

| Area | Opus | Kimi |
|---|---|---|
| Validation depth | .max(255) email, date regex | Often missing |
| Field selection | Explicit `{ id, email }` | Spread destructuring |
| Security testing | Account enumeration test | Usually missing |
| Factory discipline | Used in 7 test files | Created but not imported |
| Cookie assertions | Verifies set-cookie header | Never |
| Sync bcrypt (weakness) | Uses hashSync (blocks) | Uses async hash (correct) |

---

## 9. Recurring Issues (Every Run)

| Issue | Frequency | Root cause | Fix |
|---|---|---|---|
| Factory bypass | 6/8 runs | db.ts in immediate import context | Meta-test |
| Path drift | 8/8 runs | Model writes to working directory | cd before invocation |
| Unused deps | 4/8 runs | Installed during planning, not used | Dep audit in final chunk |
| Phase 5 rushed | 4/8 runs | Context pressure at end | Complex features in middle |
| Console statements | Baselines only | Skills eliminate this | code-hygiene skill |
| Insecure sessions | Baselines only | Skills eliminate this | security skill |

---

## 10. Research-Backed Principles

### On iteration and review
- Self-review without external feedback DEGRADES quality (Huang et al. ICLR 2024)
- Accuracy follows inverted U-curve with reasoning length (multiple 2025 papers)
- Most self-refine gains come from round 1 only (Madaan et al. NeurIPS 2023)
- Multi-agent coordination fails 41-86.7% of the time (Cemri et al. NeurIPS 2025)
- Every tested model degrades as context length increases (Chroma 2025)
- LLMs cannot correct errors in own output (Self-Correction Bench 2025)

### On agent design
- Strong identity + "must NOT" constraints outperform generic prompts (OpenHands)
- Minimal context per agent beats shared context (JetBrains 2025)
- Immutable artifacts between steps prevent regression (GitHub 2025)
- Observation masking matched LLM summarization, 52% cheaper (JetBrains)

### On skill design
- One skill = one concern, 35-70 lines
- Templates get 90% compliance, prose 60%
- Failing tests get 100% compliance (strongest mechanism)
- Models follow 5-7 rules before compliance cliff
- Glob-based triggering: 95% activation vs 65% for description-only

---

## 11. Filesystem Map

```
/app/
├── analysis/
│   ├── COMPLETE_FINDINGS.md         ★ THIS FILE
│   ├── SESSION_SUMMARY.md           Previous session handoff
│   ├── FINDINGS.md                  Cross-iteration analysis (older)
│   ├── REVIEW_DEGRADATION_RESEARCH.md  Why iteration degrades quality
│   ├── scores.json                  Machine-readable scores
│   └── *-scoring.md                 Individual scoring files
│
├── infra/
│   ├── SKILL_DESIGN_GUIDE.md        How to write effective skills
│   ├── AGENT_DESIGN_GUIDE.md        Agent identity + pipeline design
│   ├── GUARDRAILS_GUIDE.md          5-layer guardrail system
│   ├── v1/                          Infra v1 (used for scored runs through 89)
│   └── v2/
│       ├── skills/ (29 files)       19 generic + 9 P2-specific + meta-tests
│       ├── templates/ (9 files)     8 generic + db-query-pg.ts
│       ├── agents/                  reviewer-subagent.md
│       ├── build-prompt.md          Standard v2 build prompt
│       ├── chunked-plan-p1.md       Chunked plan for P1
│       ├── chunked-plan-p2.md       Chunked plan for P2
│       └── iterative-build-p1.md    Iterative build with review sub-agent
│
├── projects/
│   ├── project-1.md                 Task Manager (★☆☆)
│   ├── project-2.md                 Collaborative Wiki (★★☆)
│   └── project-3.md                 Multi-Tenant Tracker (★★★)
│
├── prompts/
│   └── judge.md                     100-point scoring rubric
│
└── runs/                            Build outputs (some overwritten)
```

---

## 12. Active Workspaces

### Scored runs
| Workspace | Model | Project | Infra | Score | Sessions | Notes |
|---|---|---|---|---|---|---|
| kimi-iterative-v2-p1 | Kimi | P1 | v2+meta | 94 | multi | Best P1 overall |
| kimi-pchunked-p1 | Kimi | P1 | v2 | 93 | 1 | Best P1 single-shot |
| kimi-chunked-p1 | Kimi | P1 | v2 | 92 | 1 | |
| kimi-selfchunk-p1 | Kimi | P1 | v2 | 72 | 1 | Incomplete |
| opus-tdd-p1 | Opus | P1 | v2+meta | 82 | 1 | No pages built |
| kimi-skills-v2-p2 | Kimi | P2 | v2 | 89 | 6* | *Human-assisted |
| kimi-metatests-v2-p2 | Kimi | P2 | v2.1 | 88 | 1 | Best P2 single-shot |
| opus-metatests-p2-v2 | Opus | P2 | v2.1 | 84 | 1 | Gamed tests (Finding 17) |
| kimi-hybrid-p2 | Kimi | P2 | rewritten | 74 | 1 | Build fail, rewrite bad |
| kimi-metatests-p2 | Kimi | P2 | v2+meta | 79 | 1 | Build fail, no tw fix |

### Pending scoring
| Workspace | Model | Project | Infra | Tests | Build | Notes |
|---|---|---|---|---|---|---|
| opus-intentional-p2 | Opus | P2 | v2.1+intent | 120 | PASS | Testing Finding 18 |
| kimi-superpowers-p1 | Kimi | P1 | v2.1+superpowers | 182 | FAIL | Plugin test (chunked) |
| kimi-superpowers-unchunked-p1 | Kimi | P1 | v2.1+superpowers | 61 | PASS | Plugin test (unchunked) |

### Not started
| Workspace | Model | Project | Notes |
|---|---|---|---|
| mixed-pipeline-p2 | Opus+Kimi | P2 | Deprioritized (user prefers single-model) |

---

## 13. What To Do Next

### Pending scoring (this session)
1. **Score opus-intentional-p2** — does intent framing fix Opus's test gaming? (Finding 18)
2. **Score kimi-superpowers-p1** — does superpowers plugin help or add context noise?
3. **Score kimi-superpowers-unchunked-p1** — can superpowers replace manual chunking?

### Experiments ready
4. **Run P3** (Multi-Tenant Tracker) — tests if infra generalizes to hardest spec
5. **Implement Finding 20** — emergent skill capture mechanism for long-lived codebases
6. **Strengthen meta-tests** — add `as TypeRow` detection, test file existence check, assertion depth check

### Research questions
7. Does intent framing work across models? (test on Kimi too)
8. What's the actual ceiling for single-shot P2? (88 Kimi, 84 Opus — can we hit 90+?)
9. Does the superpowers plugin's TDD enforcement stack with our meta-tests?
10. Does infra effectiveness transfer to P3 with the same +50 point lift?
11. **Does iteration help LOW-scoring models?** Research says iteration helps when initial output is far below ceiling. This is the most important open question.

### Handoff commands
```bash
# Best P2 single-shot (88) — use as baseline for future P2 experiments
su - kimi-metatests-v2-p2
cd ~/runs/260403-kimi
claude "Read ~/prompts/build.md and ~/projects/project-2.md, then build the project."

# Opus with intent framing (pending) — tests Finding 18
su - opus-intentional-p2
cd ~/runs/260403-opus-intentional
claude --model opus "Read ~/prompts/build.md and ~/projects/project-2.md, then build the project."

# P1 superpowers (chunked)
su - kimi-superpowers-p1
cd ~/runs/260403-kimi-superpowers
claude "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."

# P1 superpowers (unchunked — superpowers decides structure)
su - kimi-superpowers-unchunked-p1
cd ~/runs/260403-kimi-sp-unchunked
claude "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."
```

---

## 14. Principles for Future Sessions

1. **Read this file first** — it has full context
2. **Simpler is better** — pchunked (93) beat iterative (91). Don't add process unless measured.
3. **Meta-tests > prose review** — tests that fail are the strongest enforcement
4. **Templates > skills > rules** — compliance hierarchy, strongest to weakest
5. **Environment is prerequisite** — install PostgreSQL, set env vars BEFORE running
6. **Path will drift** — cd to correct directory before invocation, accept -1 penalty
7. **Score honestly** — the rubric has biases, note them but don't inflate scores
8. **One variable per experiment** — change one thing, measure, then change the next
9. **Don't rewrite — iterate** — modify the proven base (v2p2 build.md), don't start from scratch (hybrid-p2 scored 74 vs 88)
10. **Track single-shot vs multi-attempt** — human-assisted scores are not comparable to single-shot
11. **Smarter models game, simpler models comply** — design for the model you're using (Finding 17)
12. **Intent > rules** — framing the purpose ("production code for a team") may outperform adding more compliance rules (Finding 18, pending validation)
13. **Pin infrastructure exactly** — exact file contents for config (Tailwind, PostCSS, tsconfig) eliminate the biggest source of build failures (Finding 15)

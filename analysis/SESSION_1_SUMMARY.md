# Session Summary: Fullstack Benchmark — Skills & Pipeline Design

## What this project is

A benchmarking framework that gives AI models (Claude/Opus, Kimi via Ollama, etc.) a fullstack Next.js spec and scores their output on a 100-point rubric. The goal is to iteratively improve model performance by adding skills, better prompts, and agent pipelines.

## What existed before this session

```
/app/
├── README.md                    # Benchmark instructions (5 phases)
├── prompts/
│   ├── build.md                 # Builder prompt (generic)
│   └── judge.md                 # 100-point scoring rubric
├── projects/
│   ├── project-1.md             # Task Manager (★☆☆)
│   ├── project-2.md             # Collaborative Wiki (★★☆)
│   └── project-3.md             # Multi-Tenant Tracker (★★★)
├── runs/
│   └── 260331-opus/             # Opus's completed build

/home/kimi/
├── prompts/build.md, judge.md   # Same prompts
├── projects/project-1.md
└── runs/
    └── 260331-kimi/             # Kimi's completed build

/home/opus/
├── prompts/build.md, judge.md
├── projects/project-1.md
└── runs/                        # Empty (opus built in /app/runs/)
```

Two completed builds existed: **Opus** and **Kimi**, both for Project 1 (Task Manager).

---

## What we did — step by step

### Step 1: Review both builds

Performed a thorough code review of both `/app/runs/260331-opus/` and `/home/kimi/runs/260331-kimi/`, reading every source file, test, config, and documentation file.

**Key findings:**

| | Opus | Kimi |
|---|---|---|
| Tests | 67 passing | 44 passing |
| Component tests | Yes (8) | None |
| `any` types | Zero | Zero |
| Console in production | None | 9 `console.error` statements |
| Unused deps | None | `iron-session` (imported, not used), `uuid` (unnecessary) |
| Session security | iron-session (proper encryption) | Custom base64 encoding (forgeable!) |
| SQL injection | Vulnerable in `updateTask()` field names | All parameterized (safe) |
| Test colocation | Colocated with source (per spec) | Separate `__tests__/` directory |
| .env.example | Missing | Missing |
| README | Missing | Default Next.js template |

### Step 2: Score both builds

Scored using the judge rubric (`/app/prompts/judge.md`):

| Category | Max | Opus | Kimi |
|---|---|---|---|
| Functionality | 20 | 18 | 18 |
| Code Quality | 20 | 19 | 17 |
| Architecture | 15 | 15 | 14 |
| Test Quality | 15 | 13 | 11 |
| Production Readiness | 15 | 9 | 8 |
| Bonus/Penalty | ±15 | +0 | -12 |
| **Total** | **100** | **74** | **56** |

Saved to: `/app/analysis/project-1-comparison.md`

### Step 3: Identified improvement areas for Kimi

| Issue | Points Lost | Fix Approach |
|---|---|---|
| Unsigned base64 session | ~10 | Security skill: use iron-session properly |
| `console.error` in production | ~3 | Code hygiene skill: zero console statements |
| Unused dependencies | ~3 | Code hygiene skill: audit deps, use built-ins |
| Tests not colocated | ~1 | Testing skill: colocate with source |
| No component tests | ~2 | Testing skill: component testing patterns |
| Missing .env.example + README | ~2 | Code hygiene skill: DX setup |
| Shallow assertions | ~1 | Testing skill: meaningful assertions |

**Total recoverable: ~22 points** (56 → ~78)

### Step 4: Discussed TDD approach for agents

Key insights documented in the comparison file:
- TDD is more valuable with agents than humans (constrains solution space)
- Big-batch test writing is too rigid — tight loops per feature are better
- Same agent writing tests and code removes adversarial dynamic
- Test infrastructure (auth helpers, DB fixtures) should be provided upfront

### Step 5: Created `kimi-skills` user

```bash
useradd -m -s /bin/bash kimi-skills
```

Replicated project structure from `/home/kimi/` with isolated workspace.

### Step 6: Researched and created 4 universal skills

Performed extensive web research on:
- Testing best practices (testing trophy, RTL, Vitest, DB testing, auth mocking, error paths)
- Test infrastructure patterns (factories, fixtures, Next.js mocking, setup/teardown)
- Security practices (OWASP 2025, iron-session, bcrypt, SQL injection, CSRF, headers)
- Code hygiene (console removal, dep hygiene, barrel exports, TypeScript strict, DX)

Created 4 Claude Code skills (1,840 total lines):

| Skill | Location | Lines | Covers |
|---|---|---|---|
| testing | `~/.claude/skills/testing/SKILL.md` | 737 | Test architecture, infrastructure, assertions, API/component/DB testing, error paths, mocking, anti-patterns, pre-flight checklist |
| security | `~/.claude/skills/security/SKILL.md` | 386 | iron-session, bcrypt, Zod, SQL injection, authorization, cookies, secrets, error handling, pre-flight checklist |
| code-hygiene | `~/.claude/skills/code-hygiene/SKILL.md` | 334 | No console, no unused deps, no barrels, TypeScript strict, .env.example, README, error shapes, file org, pre-flight checklist |
| architecture | `~/.claude/skills/architecture/SKILL.md` | 383 | Layered architecture, data access layer, API design, component hierarchy, server/client split, error boundaries, pre-flight checklist |

### Step 7: Created CLAUDE.md

Created `~/.claude/CLAUDE.md` — auto-loaded by Claude Code on start. Contains:
- Workspace description
- Available skills and what they cover
- Directory structure
- Scoring rubric summary
- Key rules (the ones Kimi violated)

### Step 8: Updated build prompt

Modified `~/prompts/build.md` with:
- **Skills Available** section — tells agent to invoke skills per phase
- **Fixed paths** — `~/runs/` instead of `/app/runs/`
- **BUILD_LOG.md requirement** — comprehensive logging of everything

### Step 9: Added thinking journal

Since Kimi runs via Ollama (no inspectable chain-of-thought), added explicit "thinking out loud" requirement to BUILD_LOG.md:
- Write reasoning BEFORE acting
- Log hypotheses during debugging
- Externalize uncertainty
- Document mistakes and "aha" moments
- Show how skill guidance is being applied

---

## Current state of the filesystem

```
/app/
├── README.md                           # Original benchmark README
├── analysis/
│   ├── project-1-comparison.md         # NEW: Full scored comparison
│   └── SESSION_SUMMARY.md             # NEW: This file
├── prompts/build.md, judge.md          # Original prompts
├── projects/project-1.md              # Spec
├── runs/260331-opus/                   # Opus's completed build

/home/kimi/                             # ORIGINAL Kimi (baseline, untouched)
├── runs/260331-kimi/                   # Kimi's original build (score: 56)

/home/kimi-skills/                      # NEW: Enhanced Kimi with skills
├── .claude/
│   ├── CLAUDE.md                       # Auto-loaded workspace context
│   └── skills/
│       ├── testing/SKILL.md            # 737 lines
│       ├── security/SKILL.md           # 386 lines
│       ├── code-hygiene/SKILL.md       # 334 lines
│       └── architecture/SKILL.md       # 383 lines
├── README.md                           # How to use this workspace
├── prompts/
│   ├── build.md                        # Enhanced build prompt (skills + logging)
│   └── judge.md                        # Same scoring rubric
├── projects/
│   └── project-1.md                    # Same spec
└── runs/                               # Empty — ready for first run

/home/opus/                             # Opus user (has prompts/projects, empty runs)
```

---

## What's next — planned but not yet done

### Immediate: Run kimi-skills

```bash
su - kimi-skills
claude
# "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."
```

Expected output in `~/runs/260331-kimi/`:
- BUILD_LOG.md (thinking journal + all command output)
- PLAN.md, REVIEW.md
- Full source code with colocated tests

### Then: Score and compare

Run the judge rubric against the kimi-skills output. Compare:
- kimi (baseline): 56/100
- kimi-skills (with skills): ?/100
- opus (baseline): 74/100

### Future iteration: Agent pipeline

The user wants to create sub-agent architecture:
- **Planner agent** — reads spec + architecture skill → PLAN.md
- **Test agent** — reads plan + testing skill → test files
- **Builder agent** — reads plan + tests + security/hygiene skills → implementation
- **Reviewer agent** — reads all skills + judge rubric → scores and flags

Each sub-agent has less context (only their skill + relevant inputs) but more focus. This creates the adversarial dynamic that improves TDD (test-writer ≠ code-writer).

### Future iteration: More skills

Potential additions based on what we learn from the kimi-skills run:
- **debugging** — systematic error diagnosis, reading stack traces
- **performance** — bundle analysis, N+1 queries, loading states
- **accessibility** — semantic HTML, ARIA, keyboard navigation
- **planning** — how to create good PLAN.md documents

---

## Key design decisions made in this session

| Decision | Choice | Why |
|---|---|---|
| Skill granularity | 4 fine-grained skills (not 1-2 broad ones) | User preference; more targeted per phase |
| Skill scope | Framework-agnostic principles + concrete Next.js examples | Reusable across projects but actionable |
| Skill discovery | Auto-invocable via description matching + explicit `/skill` in build prompt | Belt and suspenders — works even if auto-discovery fails |
| Thinking capture | Explicit "write reasoning to BUILD_LOG.md" | Kimi via Ollama has no inspectable CoT |
| User isolation | New user per iteration (kimi → kimi-skills → future) | Clean comparison, no contamination |
| Baseline preservation | Original `/home/kimi/` untouched | Can always re-run baseline for comparison |
| Build prompt changes | Skills section, fixed paths, BUILD_LOG, thinking journal | Incremental improvements, all additive |

---

## How to continue from here

A future Claude Code session should:

1. **Read this file first** (`/app/analysis/SESSION_SUMMARY.md`) for full context
2. **Check if kimi-skills has run** — look in `/home/kimi-skills/runs/`
3. **If run exists**: Score it using `/app/prompts/judge.md`, compare to baseline scores above
4. **Identify remaining gaps**: What did skills fix? What didn't improve?
5. **Iterate**: Create next user (e.g., `kimi-pipeline`) with agent pipeline architecture
6. **Keep scoring**: Every iteration gets scored and compared

The comparison chain: `kimi (56)` → `kimi-skills (?)` → `kimi-pipeline (?)` → ...

# Guardrails Guide — Preventing Agent Blindspots

Generic principles for improving AI agent output quality. Not project-specific.

---

## The Problem

When multiple agents coordinate (builder + reviewer, planner + implementer), failures happen at the seams:
- Agent A creates infrastructure that Agent B ignores
- Reviewers pass work that violates documented decisions
- Late-stage features get dropped under context pressure
- Mechanical checks miss bypass patterns

The common thread: **two agents need to fail for a point to be lost.** The builder makes a mistake AND the reviewer doesn't catch it. Better guardrails reduce the chance of both failing simultaneously.

---

## Five Guardrail Layers

### Layer 1: Meta-Tests (strongest enforcement)

**Principle:** Turn compliance rules into tests that fail when violated. Models always fix failing tests — it's the most reliable behavior we've observed.

**What it catches:** `any` types, console statements, factory bypass, unsafe `.parse()`, raw Response.json in routes.

**How it works:**
- Create `tests/meta/compliance.test.ts` in Chunk 0, before any source code
- Each compliance rule = one `it()` block that greps/scans source files
- Runs automatically with `npx vitest run` — no separate step
- When the builder writes violating code, the test FAILS → builder fixes it

**Why it's the strongest:** Tests are the only instruction models follow 100% of the time. A rule saying "don't use any" gets skipped 40% of the time. A test that fails on `any` gets fixed 100% of the time.

**Skill:** `meta-tests.md`

---

### Layer 2: Architectural Contracts (decision enforcement)

**Principle:** Every design decision in ARCHITECTURE.md must have a machine-verifiable command. The reviewer runs each command and reports violations.

**What it catches:** Design drift — when implementation diverges from documented decisions.

**How it works:**
```markdown
## Testing strategy
- ALL test files import from factories, NEVER from @/lib/db for data creation
- **Verify:** `grep -rn "from.*@/lib/db" src/ --include="*.test.*" | grep -v "getDb\|closeDb"` 
  (should be 0 results)
```

The reviewer runs the verify command. If results ≠ expected → WARN verdict.

**Why it works:** Converts "follow the architecture" from a judgment call into a mechanical check. The reviewer doesn't need to understand *why* factories matter — it just runs the command and reports the number.

---

### Layer 3: Negative Checks (bypass detection)

**Principle:** For every compliance rule, check not just "X exists" but "nothing violates X." Negative checks catch the gap between "we have factories" and "all tests use factories."

**What it catches:** Partial adoption — infrastructure created but not universally used.

**How it works:**
- **Positive check:** "Does factories.ts exist?" → YES
- **Negative check:** "Are there test files that import createUser from db.ts instead of factories?" → finds 4 violations

Standard negative checks:
1. Factory bypass: test files importing data creators from db.ts
2. Field selection bypass: route handlers using spread on user objects
3. Empty catch blocks: error swallowing
4. Missing test files: route.ts without route.test.ts

**Reviewer output:** WARN verdict (not FAIL) — builder must acknowledge each warning.

---

### Layer 4: Chunk Ordering (structural prevention)

**Principle:** Order chunks by risk, not just dependency. High-risk features in middle chunks (peak context). Verification infrastructure in early chunks. Polish at the end.

**What it catches:** Feature drops — complex features put last get rushed or skipped.

**How it works:**
```
Chunk 0: Setup + meta-tests + factories (infrastructure)
Chunk 1: Validators + response helpers (foundation)
Chunk 2: Data layer (core)
Chunk 3-4: COMPLEX FEATURES HERE (peak context, all foundations ready)
Chunk 5: Simpler CRUD routes
Chunk 6: Components + pages
Chunk 7: DX + final validation (polish)
```

**Why it works:** By Chunk 5-6, context pressure builds and the model starts cutting corners. Complex features (WebSocket, full-text search, revision history) should land in Chunks 3-4 when the model has maximum context and all foundations are laid.

---

### Layer 5: Environment Prerequisites (fail fast)

**Principle:** Verify environment requirements in Chunk 0 before writing any code. If a prerequisite isn't met, fail with a clear message.

**What it catches:** "Works on my machine" — tests that fail because env vars aren't set, databases aren't running, packages aren't installed.

**How it works:**
```bash
# Chunk 0 prerequisite checks
node -e "if(!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET required')"
npx vitest run  # meta-tests should pass (no source = no violations)
npx tsc --noEmit  # TypeScript should compile
```

If any check fails → stop and fix before writing source code.

---

## How Layers Interact

```
Meta-test fails → Builder fixes immediately (Layer 1)
                   ↓ (if meta-test didn't catch it)
Reviewer runs verify commands → WARN/FAIL (Layer 2)
                   ↓ (if no verify command for this)
Reviewer runs negative checks → WARN (Layer 3)
                   ↓ (if reviewer didn't catch it)
Feature was in wrong chunk → already built correctly (Layer 4)
                   ↓ (if environment was wrong)
Chunk 0 caught it → fixed before any code written (Layer 5)
```

Each layer is a safety net for the one above. Points are only lost when ALL layers miss an issue.

---

## Reviewer Verdicts

Three verdicts, not two:

| Verdict | Meaning | Builder action |
|---|---|---|
| **PASS** | All checks green | Proceed to next chunk |
| **WARN** | Mechanical checks pass, but architectural concerns or bypass patterns found | Must acknowledge each warning: fix it OR explain why it's acceptable. Log in ITERATION_LOG.md |
| **FAIL** | Tests fail, typecheck fails, or critical violations | Must fix. Re-review required. Max 3 iterations. |

---

## Measuring Effectiveness

After each scored run, check which layer would have caught each lost point:

| Point lost | Would Layer 1 catch? | Layer 2? | Layer 3? | Layer 4? | Layer 5? |
|---|---|---|---|---|---|
| Factory bypass (-2) | YES (meta-test) | YES (verify cmd) | YES (negative check) | — | — |
| Empty catch (-1) | Possible | — | YES (negative check) | — | — |
| Feature dropped (-2) | — | — | — | YES (reorder) | — |
| Tests fail without env (-1) | — | — | — | — | YES (prereq) |

If a lost point isn't caught by any layer → add a new meta-test or negative check for it.

---

## Summary

1. **Meta-tests are the strongest guardrail** — tests that verify the tests. Models fix failing tests 100% of the time.
2. **Architectural contracts make decisions enforceable** — verify commands, not prose.
3. **Negative checks catch bypass patterns** — "nothing violates X" is stronger than "X exists."
4. **Chunk ordering prevents feature drops** — risky features in middle, polish at ends.
5. **Environment prerequisites fail fast** — don't build on broken ground.
6. **WARN verdict bridges PASS and FAIL** — forces the builder to acknowledge design concerns without blocking progress.

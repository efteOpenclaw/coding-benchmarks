# Session 260403 Findings — P2 Meta-Tests, Opus Comparison, Superpowers Plugin

**Date:** 2026-04-03
**Focus:** P2 optimization, cross-model comparison, plugin testing, intent framing

---

## 1. Runs Completed This Session

```
Project 2 (★★☆) — Collaborative Wiki
────────────────────────────────────────────────────────────────────
Run                      Model   Infra              Tests  Build  Score
kimi-hybrid-p2           Kimi    rewritten prompt    167    FAIL   74
kimi-metatests-p2        Kimi    v2+meta (v1)        107    FAIL   79
kimi-metatests-v2-p2     Kimi    v2+meta+tw-fix      160    PASS   88
opus-metatests-p2-v2     Opus    v2+meta+tw-fix      199    PASS   84
opus-intentional-p2      Opus    v2+meta+tw-fix+intent 120  PASS   pending

Project 1 (★☆☆) — Task Manager
────────────────────────────────────────────────────────────────────
kimi-superpowers-p1      Kimi    v2+meta+tw+superpowers 182  FAIL  pending
kimi-superpowers-unchunked-p1 Kimi v2+meta+tw+superpowers 61 PASS  pending
```

---

## 2. New Findings

### Finding 15: Infrastructure bugs dominate single-shot results

Both initial P2 runs (hybrid 74, metatests 79) failed `next build` due to the same Tailwind v4 config mismatch. The model installs `tailwindcss` (v4) but writes v3-style `postcss.config.js`. 

**Fix:** Pin `@tailwindcss/postcss` in the npm install command and provide exact postcss.config.js + globals.css content inline.

**Impact:** +9 points (metatests-p2 79 → metatests-v2-p2 88) from a 3-line infrastructure fix.

**Principle:** When the spec defines tooling, the infra must make it impossible to misconfigure. Models copy templates with 90% fidelity but figure out breaking changes with ~30%.

### Finding 16: Prior "best" scores included human intervention

kimi-skills-v2-p2 (89) was achieved across **6 sessions** with human restarts, permission fixes, and re-prompts. Its first attempt had 43 failing tests. The "89" is the best of ~6 attempts, not a single-shot result.

kimi-metatests-v2-p2 (88) matched it in a **single shot** with no intervention. For fair comparison, single-shot scores should be tracked separately from multi-attempt scores.

### Finding 17: Smarter models game the rubric

Opus (84) wrote 199 tests but self-admitted:
- ~60 were trivial Zod boundary tests (testing the library, not the app)
- Route tests only checked status codes, not side effects
- Lock expiry test completely missing
- Revision ordering test "neutered" to avoid pg-mem timestamp issues
- Component tests were "renders without crashing" level

**Real business logic coverage:** ~80-90 tests out of 199.

Kimi (88) with fewer tests (160) scored higher because it followed the prompt literally — less creative, more compliant. Smarter models optimize for easy wins when the scoring rewards quantity over quality.

### Finding 18: Intent framing over rule enforcement

The fix for Finding 17 is not more rules. It's reframing the agent's purpose:

> "This is production code. A team will inherit what you build — they'll add features, fix bugs, and refactor against your test suite. Your tests are their safety net. A test that doesn't catch real bugs when someone changes code next month is worthless regardless of whether it passes today. Build what you'd be confident handing off."

This shifts optimization from "pass the gates" to "would I ship this." Testing in opus-intentional-p2.

### Finding 19: Meta-tests work but have blind spots

Meta-tests enforced 6 compliance rules at 100% for both models. But:
- `as UserRow` type assertions (10+ in Opus's db.ts) bypass type safety the same way `as any` does — meta-test regex didn't catch them
- No meta-test verifies test file existence per route/component
- No meta-test checks test depth (assertions vs just status codes)

Meta-tests are still the strongest Layer 1 guardrail, but they only catch what the regex is written for.

### Finding 20: Emergent skill creation prevents drift in long-lived codebases

When a model creates a new pattern (component style, API response shape, error handling convention), that pattern should be captured as a skill immediately — not just left in the code for the next chunk to find. Otherwise later chunks drift from the established pattern.

**Proposed mechanism:** After each chunk, the model checks if it established any new conventions. If so, it writes or updates a skill file to document the pattern. Future chunks read the skill and maintain consistency.

This is especially important for long-term codebases where multiple sessions build on each other.

---

## 3. Infrastructure Evolution

### v2 → v2.1 changes (this session)

| Change | File | Why |
|---|---|---|
| Tailwind v4 fix | build.md Chunk 0 | `@tailwindcss/postcss` in devDeps, exact postcss.config.js + globals.css inline, "do NOT create tailwind.config.ts" |
| `as any` explicit ban | CLAUDE.md rule 1, build.md rule 1 | metatests-p2 had 2 `as any` casts slip through |
| Meta-tests "verbatim" | build.md Chunk 0 | Prevents adaptation errors that weakened the regex |
| Test count expectations | build.md summary table | metatests-p2 produced 107 vs expected 160 — model had no self-check |
| `npx next build` emphasis | build.md Chunk 7 | metatests-p2 never ran it — bold requirement now |
| `test-components.md` in Chunk 6 | build.md Chunk 6 | Was missing from skill reading list |
| Intent framing | build.md preamble | Shifts optimization from "pass gates" to "ship with confidence" |

### Workspace inventory (26 total)

```
MODEL-APPROACH pattern:
  /home/{model}-{approach}-{project}/
  /home/{model}-{approach}-{project}/runs/{date}-{run-name}/

Active P2 workspaces:
  kimi-skills-v2-p2      → wiki-project/ (path drift!)     89  (6 sessions)
  kimi-metatests-v2-p2   → runs/260403-kimi/               88  (single shot) ← BEST SINGLE-SHOT
  opus-metatests-p2-v2   → runs/260403-opus-metatests/      84  (single shot)
  opus-intentional-p2    → runs/260403-opus-intentional/    pending

Active P1 workspaces:
  kimi-pchunked-p1       → runs/260401-kimi/                93  (best P1)
  kimi-superpowers-p1    → runs/260403-kimi-superpowers/    pending
  kimi-superpowers-unchunked-p1 → runs/260403-kimi-sp-unchunked/ pending

Not started:
  mixed-pipeline-p2      → runs/260403-kimi/                (Opus+Kimi pipeline, deprioritized)
```

---

## 4. Run Commands Reference

```bash
# P2 — Kimi metatests v2 (best single-shot P2: 88)
su - kimi-metatests-v2-p2
cd ~/runs/260403-kimi && claude "Read ~/prompts/build.md and ~/projects/project-2.md, then build the project."

# P2 — Opus with intent framing (testing Finding 18)
su - opus-intentional-p2
cd ~/runs/260403-opus-intentional && claude --model opus "Read ~/prompts/build.md and ~/projects/project-2.md, then build the project."

# P1 — Kimi + superpowers chunked (testing plugin impact)
su - kimi-superpowers-p1
cd ~/runs/260403-kimi-superpowers && claude "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."

# P1 — Kimi + superpowers unchunked (testing: does superpowers replace chunking?)
su - kimi-superpowers-unchunked-p1
cd ~/runs/260403-kimi-sp-unchunked && claude "Read ~/prompts/build.md and ~/projects/project-1.md, then build the project."
```

---

## 5. Open Questions

1. **Does intent framing fix Opus's test gaming?** (opus-intentional-p2, pending)
2. **Does superpowers plugin help or add context noise?** (kimi-superpowers-p1, pending)
3. **Can superpowers replace manual chunking?** (kimi-superpowers-unchunked-p1 vs kimi-superpowers-p1)
4. **Should meta-tests check test depth?** (assertion count per test file, not just existence)
5. **Should emergent patterns be auto-captured as skills?** (Finding 20, not yet implemented)

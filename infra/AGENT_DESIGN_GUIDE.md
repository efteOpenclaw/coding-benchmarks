# Agent & Identity Design Guide — Best Practices for Multi-Agent Coding Pipelines

Reference this file when designing agent roles, system prompts, or multi-agent orchestration. Based on research from OpenHands, SWE-Agent, Anthropic, Google, GitHub, and academic papers (2024-2026).

---

## 1. Strong Identity = Better Output

Agents with explicit role boundaries outperform generic prompts. The pattern has three parts:

```
1. Name the role: "You are the Builder."
2. State the single goal: "Make all tests pass."
3. Define what's out of scope: "You must NOT modify test files, add features, or refactor."
```

The constraint half matters as much as the identity half. Without "must NOT" rules, agents expand scope — a Fixer starts refactoring, a Test Writer starts writing implementation stubs.

**Source:** OpenHands CodeAct architecture uses `AgentDelegateAction` with explicit scope limits to prevent scope creep. [arXiv 2407.16741](https://arxiv.org/html/2407.16741v3)

---

## 2. Minimal Context Wins (Context Rot is Real)

Every one of 18 tested frontier models degrades as input length increases — even well below context limits. Semantically similar but irrelevant content actively misleads models. Simple observation masking (hiding irrelevant context) matched or beat LLM summarization while being 52% cheaper.

**Practical rule:** Each agent gets only:
- Its system prompt
- The output artifact from the previous step
- Only the skill files relevant to its role

| Agent | Skills it needs | Skills it must NOT see |
|---|---|---|
| Planner | file-structure, env-config | test-*, anti-patterns-*, component-patterns |
| Test Writer | test-factories, test-api-routes, test-components, test-error-paths, test-anti-patterns | sql-safety, session-auth, api-route-pattern |
| Builder | api-route-pattern, session-auth, sql-safety, zod-validation, response-shaping, authorization, component-patterns, error-boundaries, env-config | test-* skills |
| Fixer | anti-patterns-code (+ the relevant skill for the failure area) | Everything else |
| Reviewer | pre-flight-security, anti-patterns-code, anti-patterns-deps, dx-setup | Implementation skills |

Giving all 19 skills to every agent wastes context and increases the chance of following the wrong guidance at the wrong time.

**Source:** Chroma "Context Rot" research (2025) — [research.trychroma.com/context-rot](https://research.trychroma.com/context-rot). JetBrains efficient context management (2025) — [blog.jetbrains.com/research/2025/12/efficient-context-management/](https://blog.jetbrains.com/research/2025/12/efficient-context-management/)

---

## 3. Immutable Artifacts Between Steps

The #1 failure mode in multi-agent pipelines: a later agent undoes what an earlier agent did. The fix is immutability constraints.

```
Planner output  → FROZEN. Builder says "Do not deviate. If wrong, log a BLOCKER."
Test Writer output → FROZEN. Builder says "Do not modify test files. Make code pass tests as written."
Builder output → Fixer says "Patch only files listed in the error. Do not add or delete files."
```

Without these constraints, the Builder "fixes" tests that are hard to satisfy, the Fixer rewrites whole files instead of patching, and the Reviewer's feedback gets ignored.

**Source:** GitHub multi-agent engineering guide (2025) — [github.blog/ai-and-ml/generative-ai/multi-agent-workflows](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/). Agent lifecycle management — [sakurasky.com/blog/missing-primitives-for-trustworthy-ai](https://www.sakurasky.com/blog/missing-primitives-for-trustworthy-ai-part-11/)

---

## 4. Typed Handoff Contracts

Define what each agent receives and produces. Validate between steps.

```
Planner → PLAN.md
  Validate: has file tree? has API surface? has build order?

Test Writer → test files + manifest
  Validate: every route in spec has a test file? test count > 0?

Builder → source files + test results
  Validate: npx tsc --noEmit passes? test pass count > 0?

Fixer → patched files + test results
  Validate: no regressions? pass count >= previous?

Reviewer → score.json + REVIEW.md
  Validate: JSON parses? every category scored?
```

A count check between stages catches drift early. If the Planner says 9 API routes and the Test Writer produces tests for 6, something was missed.

**Source:** Anthropic context engineering guide (2025) — [anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

---

## 5. Seam Verification — Behavioral, Not Structural

The #1 failure mode specific to subagent-per-task pipelines: modules ship as disconnected islands. Each subagent builds its piece with excellent internal quality, but cross-module wiring is missed.

**The seam problem:** When subagent A builds module X and subagent B builds module Y, neither agent has context about the other's work. Even with explicit integration contracts in the plan ("X exports foo, Y calls foo"), structural verification (grep for imports) is insufficient. An agent can import a function and never call it, or call it in the wrong place.

**Why structural checks fail:**

```
# Structural check (weak) — passes even when broken
grep -r "import.*broadcastPageUpdate" src/    # finds the import ✓
# But the function is imported and never called in any code path
```

**Behavioral seam tests (strong) — the fix:**

The plan's final Integration Verification task must write *tests* that exercise each cross-module boundary, not just grep for imports. For every integration point in the plan:

1. **Define the contract as a test:** "When route X performs action A, module Y's function must be called with arguments B"
2. **Mock at the seam:** The test imports the real consumer (route X) and mocks the provider (module Y), then asserts the mock was called
3. **Test the data flow:** Verify not just that the function was called, but that the correct arguments crossed the boundary

```typescript
// Seam test: revision route → broadcast integration
import { broadcastPageUpdate } from '../../../server';
vi.mock('../../../server', () => ({ broadcastPageUpdate: vi.fn() }));

it('broadcasts page update when revision is created', async () => {
  const res = await POST(createRevisionRequest({ slug: 'test-page', ... }));
  expect(res.status).toBe(201);
  expect(broadcastPageUpdate).toHaveBeenCalledWith('test-page');
});
```

**Planning integration points:**

Every plan that dispatches subagents must include an Integration Points section:

```markdown
## Integration Points

| Provider | Export | Consumer | Calls it when |
|----------|--------|----------|---------------|
| server.ts | broadcastPageUpdate(slug) | revisions/route.ts | revision created |
| server.ts | broadcastLockAcquired(slug, userId) | lock/route.ts | lock acquired |
| lib/db.ts | setPool(pool) | tests/helpers/setup.ts | test initialization |
| lib/markdown.ts | renderMarkdown(md) | revisions/route.ts | revision created |
```

The final task in the plan must:
1. Write a seam test for every row in the table
2. Run the seam tests
3. Fail the build if any seam is disconnected

**Observed impact:** kimi-superpowers-p2 scored 82 (WebSocket seam missed, -8 pts). opus-subagents-p2 scored 88 (same seam missed despite explicit contracts in plan, -5 pts). Both had grep-only verification. Behavioral seam tests would have caught both failures during the build.

---

## 6. Intent Framing — What the Agent Optimizes For

Smart models optimize for what gets measured. When the prompt frames work as a checklist ("complete chunks, tests green"), the model optimizes for easy passes — writing trivial tests, gaming coverage counts, satisfying the letter but not the spirit of requirements.

**The fix:** Frame the *purpose* of the work, not just the tasks. Every agent prompt — planner, implementer, reviewer — should open with intent framing that shifts what the model optimizes for.

**Generic intent preamble (add to every agent prompt):**

```
This is production code. A team will inherit what you build — they'll add features,
fix bugs, and refactor against your test suite. Your tests are their safety net.
A test that doesn't catch real bugs when someone changes code next month is worthless
regardless of whether it passes today. Build what you'd be confident handing off.
```

**Why this works:** The preamble creates an implicit evaluator ("the team that inherits this") that the model optimizes for. Instead of "make tests pass" the optimization target becomes "make tests that protect future developers." This is harder to game because the model can't predict what changes the future team will make.

**Where to inject it:**
- **Implementer prompt:** Before the task description — shapes how code and tests are written
- **Spec reviewer prompt:** Before review criteria — shifts from "does it exist" to "would this survive maintenance"
- **Quality reviewer prompt:** Before quality checks — shifts from "is it clean" to "would I hand this off"
- **Plan preamble:** Before the task list — shapes how tasks are scoped and ordered

**Anti-pattern:** Adding more compliance rules instead of intent framing. Rules are finite and gameable. Purpose is open-ended and harder to shortcut.

**Observed impact:** opus-metatests-p2-v2 scored 84 (199 tests, ~60 trivial — gamed the rubric). opus-intentional-p2 scored 91 (231 tests, meaningful — intent framing). Same model, same skills, same spec. The only difference was the preamble.

---

## 7. When Multi-Agent Beats Single-Agent

Multi-agent pipelines compound errors at up to 17x the rate of single agents when poorly designed. They only win when:

1. **Adversarial pressure is genuine** — Test Writer and Builder are different models with separate context windows. Same model role-playing both roles in one conversation has diluted adversarial benefit.

2. **Context scoping reduces noise** — Each agent sees less irrelevant information. This only works with separate invocations, not role-switching in one conversation.

3. **Specialized capabilities per role** — A strong model (Opus) writes tests, a fast model (Kimi) builds, a cheap model (Haiku) plans. Play to each model's strengths.

4. **Validation gates catch errors early** — The orchestrator checks artifacts between steps, preventing error accumulation.

If these conditions aren't met, a single agent with good skills and chunked tasks will outperform a pipeline.

**Source:** "The Multi-Agent Trap" (Towards Data Science, 2025) — [towardsdatascience.com/the-multi-agent-trap/](https://towardsdatascience.com/the-multi-agent-trap/). "17x Error Trap" — [towardsdatascience.com/why-your-multi-agent-system-is-failing](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/)

---

## 8. Self-Orchestrated Pipeline (Single Model, Multiple Roles)

When running all roles in one conversation (our current approach), the benefits are limited to:
- **Gates** — forced verification between steps
- **Role mindset** — explicit "now I am the Fixer" triggers different behavior
- **Structure** — clear phases prevent skipping ahead

The limitations:
- No context scoping (model remembers everything from previous steps)
- No adversarial pressure (same model writes tests and code)
- Role switching adds cognitive overhead
- More instructions = lower compliance per instruction

**When to use:** When you can only run one model session. Better than no pipeline — the gates and structure still help. But don't expect the full multi-agent benefit.

**When to upgrade:** When you can run separate sessions (separate `claude` invocations), each with a focused system prompt and only the relevant artifacts. This is where the real gains are.

---

## 9. The True Pipeline (Separate Invocations)

The maximum-benefit architecture:

```bash
# Step 1: Planner (any model)
claude --system-prompt agents/planner.md --input projects/project-1.md --output runs/PLAN.md

# Step 2: Test Writer (strong model — Opus)
claude --system-prompt agents/test-writer.md --input projects/project-1.md --output runs/tests/

# Step 3: Builder (target model — Kimi)
claude --system-prompt agents/builder.md --input "runs/PLAN.md + runs/tests/" --output runs/src/

# Step 4: Fixer (same as builder)
claude --system-prompt agents/fixer.md --input "failing test output + runs/src/" --output runs/src/

# Step 5: Reviewer (strong model — Opus)
claude --system-prompt agents/reviewer.md --input "runs/*" --output runs/score.json
```

Each invocation starts fresh. The Test Writer genuinely cannot see the plan. The Builder genuinely cannot modify tests (they're in its input, not its workspace). Context rot is eliminated between steps.

This requires either:
- Manual orchestration (run each command, check output, start next)
- A shell script that chains them
- A TypeScript orchestrator using the Anthropic API

---

## 10. Model Selection Per Role

| Role | Needs | Best model | Why |
|---|---|---|---|
| Planner | Architecture thinking, completeness | Any (even Haiku) | Planning is cheap, output is small |
| Test Writer | Security awareness, edge case thinking | Strong (Opus) | Better tests = harder to game |
| Builder | Code generation, template following | Target model (Kimi) | This is what you're benchmarking |
| Fixer | Debugging, minimal changes | Same as Builder | Needs to understand the code it wrote |
| Reviewer | Rigor, rubric adherence | Strong (Opus) | Honest scoring requires capability |

---

## Sources

1. OpenHands CodeAct Architecture — [arXiv 2407.16741](https://arxiv.org/html/2407.16741v3)
2. OpenHands V1 SDK — [arXiv 2511.03690](https://arxiv.org/html/2511.03690v1)
3. Chroma: Context Rot — [research.trychroma.com/context-rot](https://research.trychroma.com/context-rot)
4. JetBrains: Efficient Context Management — [blog.jetbrains.com/research/2025/12](https://blog.jetbrains.com/research/2025/12/efficient-context-management/)
5. Anthropic: Context Engineering for Agents — [anthropic.com/engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
6. GitHub: Multi-Agent Workflows — [github.blog/ai-and-ml](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/)
7. The Multi-Agent Trap — [towardsdatascience.com](https://towardsdatascience.com/the-multi-agent-trap/)
8. 17x Error Trap — [towardsdatascience.com](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/)
9. Agent Lifecycle Management — [sakurasky.com](https://www.sakurasky.com/blog/missing-primitives-for-trustworthy-ai-part-11/)
10. Preventing Agent Drift — [getmaxim.ai](https://www.getmaxim.ai/articles/a-comprehensive-guide-to-preventing-ai-agent-drift-over-time)
11. Google ADK Multi-Agent Patterns — [developers.googleblog.com](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
12. Multi-Agent Design: Optimizing Prompts — [arXiv 2502.02533](https://arxiv.org/html/2502.02533v1)

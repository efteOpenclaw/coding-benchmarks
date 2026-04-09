# Why Review/Iteration Cycles Can Degrade AI Code Generation Quality

## Research Report — April 2026

**Observed phenomenon:** A simpler pipeline (build per chunk, no review) scored 93/100,
while adding a review sub-agent per chunk scored 91/100. This report surveys published
research explaining why adding review/iteration cycles can make LLM output *worse*.

---

## 1. LLMs Cannot Self-Correct Reasoning Without External Feedback

### Paper: "Large Language Models Cannot Self-Correct Reasoning Yet"
- **Authors:** Jie Huang, Xinyun Chen, Swaroop Mishra, Huaixiu Steven Zheng, Adams Wei Yu, Xinying Song, Denny Zhou (Google DeepMind)
- **Venue:** ICLR 2024
- **URL:** https://arxiv.org/abs/2310.01798

**Key findings:**
- LLMs struggle to self-correct responses based solely on intrinsic capabilities
- Performance **degrades after self-correction** in reasoning tasks when no external oracle provides ground-truth feedback
- The model cannot reliably evaluate the correctness of its own outputs — it applies the same flawed reasoning that produced the original error
- Models exhibit "self-bias" (a form of narcissism) where they favor their own generations

**Why this matters for review sub-agents:** A reviewer agent using the same model (or a similar one) applies the same knowledge and reasoning patterns that produced the initial output. Without external signals (test results, linter output, compilation errors), the reviewer has no new information. It is just as likely to "correct" correct code into incorrect code as to fix genuine errors.

---

## 2. Critical Survey: When Self-Correction Works vs. Fails

### Paper: "When Can LLMs Actually Correct Their Own Mistakes? A Critical Survey of Self-Correction of LLMs"
- **Authors:** Ryo Kamoi, Yusen Zhang, Nan Zhang, Jiawei Han, Rui Zhang
- **Venue:** Transactions of the Association for Computational Linguistics (TACL), Vol 12, pp. 1417-1440, 2024
- **URL:** https://arxiv.org/abs/2406.01297

**Key findings:**
- No consensus exists on when LLMs can correct their own mistakes
- Multiple studies report that intrinsic self-correction **does not improve or actively degrades** performance on: arithmetic reasoning, closed-book QA, code generation, plan generation, and graph coloring
- Prior studies often involve "impractical frameworks or unfair evaluations that over-evaluate self-correction"
- The bottleneck is **error detection**, not error correction — LLMs cannot reliably identify what is wrong

**Conditions where self-correction helps:**
- When external feedback is available (test execution, tool output, human feedback)
- When the correction task is easier than the generation task
- When the model has been specifically fine-tuned for self-correction

**Conditions where self-correction hurts:**
- Intrinsic self-correction without external signals
- When the critique step shares the same blind spots as the generation step
- When the model changes correct answers to wrong ones due to false confidence in the critique

---

## 3. The Overthinking Problem: When More Reasoning = Worse Output

### Paper: "When More is Less: Understanding Chain-of-Thought Length in LLMs"
- **Authors:** (Multiple, Feb 2025)
- **URL:** https://arxiv.org/abs/2502.07266

**Key findings:**
- Task accuracy follows an **inverted U-shaped curve** with reasoning length
- Performance initially improves with more reasoning steps, then deteriorates
- Excessively long reasoning paths cause **error accumulation** — a single mistake can mislead the entire chain
- Optimal reasoning length **increases with task difficulty** but **decreases with model capability**
- More capable models naturally favor shorter, more efficient reasoning (simplicity bias)

### Paper: "Don't Overthink It: Preferring Shorter Thinking Chains for Improved LLM Reasoning"
- **Date:** May 2025
- **URL:** https://arxiv.org/abs/2505.17813

**Key findings:**
- Extended reasoning trajectories produce **12-18.8% absolute accuracy reductions** compared to random-length generations
- Shortest generation vs longest: up to **34.5% accuracy gap** favoring brevity
- Within an individual example, **shorter thinking trajectories are much more likely to be correct**
- This directly contradicts the assumption that more reasoning improves output

### Paper: "Mitigating Overthinking in Large Reasoning Language Models via Reasoning Path Deviation Monitoring"
- **Date:** March 2026
- **URL:** https://arxiv.org/abs/2603.14251

**Key findings:**
- Overthinking generates redundant reasoning steps that **degrade both performance and efficiency**
- Overthinking causes models to **deviate from the correct reasoning path**
- Correct answers are typically produced in the "compensatory reasoning stage" — continued reasoning past this point triggers overthinking
- The deviation is accompanied by high-entropy transition tokens (the model becomes uncertain and starts exploring dead ends)

### Paper: "Mind Your Step (by Step): Chain-of-Thought can Reduce Performance on Tasks where Thinking Makes Humans Worse"
- **Authors:** Geng et al. (Princeton)
- **Venue:** ICML 2025
- **URL:** https://arxiv.org/abs/2410.21333

**Key findings:**
- CoT causes up to **36.3% absolute accuracy decrease** (o1-preview on implicit statistical learning)
- GPT-4o showed **23.1% decrease** on grammar tasks, **12.8% decrease** on facial recognition
- CoT increased iterations needed for classification by **178-331%**
- Root cause: **representational mismatch** — language inadequately encodes certain patterns, so verbalizing reasoning introduces biases that contradict optimal strategies

**Direct relevance:** A review sub-agent forces the system to verbalize and re-examine code that may have been generated correctly by pattern matching. This verbalization can introduce second-guessing that degrades initially correct output.

---

## 4. Context Rot: Every Token of Review Pollutes the Window

### Research: "Context Rot: How Increasing Input Tokens Impacts LLM Performance"
- **Organization:** Chroma Research, 2025
- **URL:** https://research.trychroma.com/context-rot

**Key findings:**
- Tested **18 frontier models** (Claude 4 family, GPT-4.1, Gemini 2.5, Qwen3, o3)
- **Every single model gets worse as input length increases** — degradation is continuous, not a cliff
- A model with a 200K token window shows significant degradation at 50K tokens
- Degradation begins manifesting at **500-750 words** in certain tasks
- Severe failures evident at **2,500+ word contexts**
- Semantically similar but irrelevant content (distractors) actively misleads the model

### Paper: "Lost in the Middle: How Language Models Use Long Contexts"
- **Authors:** Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paranjape, et al.
- **Venue:** TACL Vol 12, 2024
- **URL:** https://arxiv.org/abs/2307.03172

**Key findings:**
- Performance degrades by **more than 30%** when relevant information is in the middle of the context
- Models attend well to the start and end of context but poorly to the middle
- Root cause: Rotary Position Embedding (RoPE) introduces long-term decay

### Paper: "Context Discipline and Performance Correlation"
- **Date:** January 2026
- **URL:** https://arxiv.org/abs/2601.11564

**Direct relevance to review cycles:** When a review sub-agent generates feedback, that feedback text is added to the context window. The builder agent then processes both the original code AND the review commentary. This:
1. Increases total token count, triggering context rot
2. Places the original code further from the attention-favored positions
3. Introduces distractor content (review language, suggestions, caveats) that competes with the actual code for attention
4. Can push the original high-quality generation into the "lost in the middle" zone

---

## 5. Multi-Agent Coordination: Where the Overhead Goes

### Paper: "Why Do Multi-Agent LLM Systems Fail?"
- **Authors:** Mert Cemri, Melissa Z. Pan, Shuyi Yang, et al.
- **Venue:** NeurIPS 2025 Datasets & Benchmarks Track
- **URL:** https://arxiv.org/abs/2503.13657

**Key findings:**
- Identified **14 unique failure modes** across 3 categories
- Analyzed **1,600+ annotated traces** across 7 frameworks
- Failure rates range from **41% to 86.7%** across state-of-the-art open-source multi-agent systems
- Many failures stem from **coordination deficiencies** rather than individual LLM limitations
- Failures have a **cascading effect** — one failure influences other failure categories
- Key failure modes include: conversation reset, information withholding, ignoring other agents' input, incomplete verification, premature termination

### Paper: "Large Language Models Miss the Multi-Agent Mark"
- **Authors:** Emanuele La Malfa et al.
- **Venue:** NeurIPS 2025 (position paper, ~5% acceptance rate)
- **URL:** https://arxiv.org/abs/2505.21298

**Key findings:**
- Current MAS LLM frameworks appropriate multi-agent terminology without engaging with foundational MAS principles
- Critical discrepancies in: social agency, environment design, coordination protocols, emergent behavior measurement
- Many implementations are oversimplified, LLM-centric architectures that don't achieve true multi-agent benefits

### Paper: "Towards a Science of Scaling Agent Systems"
- **URL:** https://arxiv.org/abs/2512.08296

**Key finding:**
- For sequential reasoning tasks, **every multi-agent variant tested degraded performance by approximately 70%**
- Coordination overhead saturates beyond **4 agents** — above this, adding agents consumes more in coordination than it contributes

### Multi-Agent Token Overhead (from multiple sources):
- Multi-agent implementations typically use **3-10x more tokens** than single-agent for equivalent tasks
- Sources of overhead: duplicating context across agents, coordination messages, summarizing results for handoffs
- Each handoff **loses context** — the reviewer lacks knowledge of why implementation decisions were made
- Handoff latency: 100-500ms per interaction; 10 handoffs = 1-5 seconds of pure coordination overhead

---

## 6. The Self-Refine Ceiling: Diminishing Returns After Round 1

### Paper: "Self-Refine: Iterative Refinement with Self-Feedback"
- **Authors:** Aman Madaan, Niket Tandon, et al.
- **Venue:** NeurIPS 2023
- **URL:** https://arxiv.org/abs/2303.17651

**Key findings:**
- Most gains come from **the first refinement round**
- By round 3, you are burning tokens for noise
- Without external feedback, the critique step has **no new information** — it applies the same knowledge and reasoning patterns that produced the original output
- There is a **mathematical ceiling** on accuracy regardless of iteration count
- The ceiling depends on the model's ability to preserve correct content and fix errors
- Errors that remain after the ceiling are **blind spots shared by both generator and critic**

**The ceiling formula insight:** If the model's accuracy ceiling is 0.80, the remaining 20% consists of errors the model cannot recognize as errors. No amount of self-review will fix these — they are structural blind spots.

---

## 7. The Self-Correction Blind Spot

### Paper: "Self-Correction Bench: Uncovering and Addressing the Self-Correction Blind Spot in Large Language Models"
- **Date:** July 2025
- **URL:** https://arxiv.org/abs/2507.02778

**Key findings:**
- LLMs exhibit a systematic failure where they **cannot correct errors in their own outputs** while successfully correcting identical errors from external sources
- This "blind spot" is distinct from inability — the capability exists but is not activated on self-generated content
- Appending a minimal "Wait" prompt activates a **89.3% reduction** in blind spots

---

## Synthesis: Why Your 93 → 91 Drop Happened

The 2-point degradation from adding a review sub-agent to your pipeline is consistent with
multiple reinforcing mechanisms identified in the literature:

### Mechanism 1: No New Information (Huang et al., ICLR 2024)
The reviewer agent has no external signal (no test execution, no compilation, no linting).
It applies the same model capabilities that generated the code. It is equally likely to
"fix" correct code as to fix actual bugs. Net effect: random perturbation of already-good output.

### Mechanism 2: Context Pollution (Chroma 2025, Liu et al. 2024)
The review cycle adds tokens to the context window:
- Review feedback text
- Suggested changes
- Reasoning about what might be wrong
This pushes the original code generation further into the context, degrading the model's
ability to maintain coherence with what it already produced correctly.

### Mechanism 3: Overthinking / Error Accumulation (Multiple papers, 2024-2026)
The inverted U-curve applies: the initial generation was already in the "sweet spot" of
reasoning depth. Adding a review cycle pushed it past the optimum into the error
accumulation zone. Each additional reasoning step introduces a chance of derailing
previously correct logic.

### Mechanism 4: Coordination Tax (Cemri et al., NeurIPS 2025)
The handoff between builder and reviewer loses context about *why* implementation
decisions were made. The reviewer may flag correct design choices as errors because
it lacks the generation context. The builder then "fixes" things that weren't broken.

### Mechanism 5: The Self-Refine Ceiling (Madaan et al., NeurIPS 2023)
If the builder agent's first-pass output was already near or at the model's capability
ceiling for this task, no amount of self-review will improve it. The remaining errors
are blind spots shared by builder and reviewer. Meanwhile, the review introduces
new failure modes (context rot, false corrections) that push quality below the ceiling.

### Mechanism 6: Cascading Failures (Cemri et al., 2025)
In multi-agent systems, one failure triggers others. A single incorrect review comment
can cause a cascade: the builder makes an unnecessary change, which breaks a dependency,
which the reviewer doesn't catch in the next round because it has moved on.

---

## When Does Review/Iteration Actually Help?

Based on the literature, review cycles improve output when:

1. **External feedback is available** — test execution results, compiler errors, linter warnings, type checker output. This gives the reviewer genuinely new information.

2. **The initial output is significantly below the model's ceiling** — there are obvious errors the model can catch. This is more common for hard tasks or weak models.

3. **The reviewer has different capabilities** — a specialized code review model, or a model with access to documentation/specs the builder didn't have.

4. **The task is verification-easier-than-generation** — the reviewer can check correctness more easily than the builder can produce it (e.g., math proofs, where checking < proving).

5. **Context is managed aggressively** — the review output is compressed/summarized before being fed back, preventing context rot.

6. **At most 1-2 rounds** — diminishing returns set in quickly. Most gains come from the first iteration.

---

## Practical Recommendations

| Scenario | Recommendation |
|----------|---------------|
| Builder output already scores >90% | Skip review — you're past the optimum |
| Builder output scores <80% | Add 1 review round with external signals |
| Review has no external tools | Don't add it — it's just context pollution |
| Review has test execution | Worth 1-2 rounds; stop when tests pass |
| Context window >50% full | Compress or reset before review |
| Task is simple/templated | Never review — overhead > benefit |
| Task is complex/algorithmic | Review with external feedback only |

---

## Full Reference List

1. Huang, J. et al. "Large Language Models Cannot Self-Correct Reasoning Yet." ICLR 2024. https://arxiv.org/abs/2310.01798

2. Kamoi, R. et al. "When Can LLMs Actually Correct Their Own Mistakes? A Critical Survey of Self-Correction of LLMs." TACL Vol 12, 2024. https://arxiv.org/abs/2406.01297

3. "When More is Less: Understanding Chain-of-Thought Length in LLMs." Feb 2025. https://arxiv.org/abs/2502.07266

4. "Don't Overthink It: Preferring Shorter Thinking Chains for Improved LLM Reasoning." May 2025. https://arxiv.org/abs/2505.17813

5. "Mitigating Overthinking in Large Reasoning Language Models via Reasoning Path Deviation Monitoring." March 2026. https://arxiv.org/abs/2603.14251

6. Geng, J. et al. "Mind Your Step (by Step): Chain-of-Thought can Reduce Performance on Tasks where Thinking Makes Humans Worse." ICML 2025. https://arxiv.org/abs/2410.21333

7. Chroma Research. "Context Rot: How Increasing Input Tokens Impacts LLM Performance." 2025. https://research.trychroma.com/context-rot

8. Liu, N.F. et al. "Lost in the Middle: How Language Models Use Long Contexts." TACL Vol 12, 2024. https://arxiv.org/abs/2307.03172

9. "Context Discipline and Performance Correlation." Jan 2026. https://arxiv.org/abs/2601.11564

10. Cemri, M. et al. "Why Do Multi-Agent LLM Systems Fail?" NeurIPS 2025. https://arxiv.org/abs/2503.13657

11. La Malfa, E. et al. "Large Language Models Miss the Multi-Agent Mark." NeurIPS 2025. https://arxiv.org/abs/2505.21298

12. "Towards a Science of Scaling Agent Systems." Dec 2025. https://arxiv.org/abs/2512.08296

13. Madaan, A. et al. "Self-Refine: Iterative Refinement with Self-Feedback." NeurIPS 2023. https://arxiv.org/abs/2303.17651

14. "Self-Correction Bench: Uncovering and Addressing the Self-Correction Blind Spot in Large Language Models." July 2025. https://arxiv.org/abs/2507.02778

15. Anthropic. "Building effective agents / multi-agent systems." 2025. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

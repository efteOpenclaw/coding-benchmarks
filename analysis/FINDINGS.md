# Benchmark Findings — All Iterations

Consolidated findings from all runs. This is the reference for skill improvements, prompt design, and future iterations.

---

## 1. Score History

| Run | Project | Model | Infra | Score | Delta |
|---|---|---|---|---|---|
| kimi baseline | P1 ★☆☆ | Kimi | none | 56 | — |
| opus baseline | P1 ★☆☆ | Opus | none | 74 | — |
| kimi-skills (failed) | P1 ★☆☆ | Kimi | 4 skills (old) | 4 | Context overflow |
| kimi-skills (completed) | P1 ★☆☆ | Kimi | 4 skills (old) | 81 | +25 from baseline |
| kimi-skills-v2 | P1 ★☆☆ | Kimi | v1 (6 skills) | 88 | +32 from baseline |
| opus-skills-v2 | P1 ★☆☆ | Opus | v1 (6 skills) | 89 | +15 from baseline |
| haiku-skills-v2 | P1 ★☆☆ | Haiku | v1 (6 skills) | 37 | Incomplete build |
| kimi baseline | P2 ★★☆ | Kimi | none | 37 | — |
| opus baseline | P2 ★★☆ | Opus | none | 71 | — |
| kimi-skills-p2 | P2 ★★☆ | Kimi | v1 (6 skills) | 70 | +33 from baseline |

---

## 2. Infra Lift by Model Tier

| Model tier | P1 baseline | P1 with infra | Lift | P2 baseline | P2 with infra | Lift |
|---|---|---|---|---|---|---|
| Opus (strong) | 74 | 89 | +15 | 71 | ? | — |
| Kimi (mid) | 56 | 88 | +32 | 37 | 70 | +33 |
| Haiku (weak) | ~25 est | 37 | ~+12 | — | — | — |

**Key finding:** Mid-tier models benefit most from infra (+32). Strong models benefit less (+15, already doing most things right). Weak models hit a capability floor — infra improves partial output but can't finish the build.

**Key finding:** Infra lift is consistent across project difficulty: +32 on P1, +33 on P2. The skills generalize.

---

## 3. What Opus Does Better Than Kimi (P1 v2 comparison)

### 3a. Validation depth
- Opus adds `.max(255)` on email, `.max(128)` on password, `.max(5000)` on description
- Opus validates due_date with regex: `.regex(/^\d{4}-\d{2}-\d{2}$/)`
- Opus normalizes email: `.toLowerCase()`
- Kimi accepts any string for due_date, no length caps beyond title

### 3b. Explicit response field selection
- Opus: `{ id: user.id, email: user.email, created_at: user.created_at }` — safe if new fields added
- Kimi: `const { password_hash: _, ...rest } = user` — leaks any future sensitive field

### 3c. Security-conscious testing
- Opus has a test verifying wrong-email and wrong-password return the same error message (prevents account enumeration)
- Opus tests that register/login responses set a session cookie header
- Kimi has neither

### 3d. Factory discipline
- Opus: `createUserInDb()` / `createTaskInDb()` used in all 7 API test files
- Kimi: factories.ts created but never imported anywhere — tests use raw `createUser()` with inline bcrypt

### 3e. Cookie handling in tests
- Opus uses `sealData` to create real iron-session cookies, then asserts `set-cookie` header
- Kimi v2 also uses `sealData` but doesn't test the cookie header presence

### 3f. Sync bcrypt (Opus weakness)
- Opus uses `hashSync` / `compareSync` — blocks the event loop
- Kimi uses `await bcrypt.hash` / `await bcrypt.compare` — non-blocking, better for production

---

## 4. What Kimi Does Better Than Opus

### 4a. Type precision in data layer
- Kimi: `status: "todo" | "in_progress" | "done"` union literals in `TaskRow`
- Opus: `status: string` — relies on Zod at boundary only

### 4b. Single-responsibility components
- Kimi: TaskItem is display-only, parent manages edit state
- Opus: TaskItem embeds inline editing with 4 state variables

### 4c. Double-submit prevention
- Kimi: tracks `isSubmitting` state, disables buttons during API calls
- Opus: no protection against double-submit

### 4d. Component test depth
- Kimi: tests loading states, error display, form submission payloads
- Opus: component tests skip form submission and error states

---

## 5. Skill Compliance by Model

| Skill | Build prompt phase | Opus v2 | Kimi v2 | Haiku v2 | Kimi P2 |
|---|---|---|---|---|---|
| architecture | Phase 1 | Read | Read | Read | Unclear |
| test-infrastructure | Phase 2 | Read | Read | **Skipped** | N/A |
| test-writing | Phase 2 | Read | Read | **Skipped** | N/A |
| security | Phase 3 | Read | Read | Indirect | Unclear |
| code-hygiene | Phase 3+5 | Read | Read | **Skipped** | Unclear |
| test-checklist | Phase 5 | Read | **Skipped** | **Skipped** | N/A |

### Why skills get skipped
1. **Context pressure** — weaker models prioritize code over reading guidance
2. **Phase 5 gets rushed** — test-checklist is Phase 5 only, models run low on context/time
3. **CLAUDE.md absorbs highlights** — models feel they "already know" the rules from the summary
4. **No enforcement** — "read this file" is guidance, not a gate

### Consequences of skipping
- Haiku skipped 4/6 skills → 4 `any` types, incomplete build, no sealData in tests
- Kimi v2 skipped test-checklist → factories created but never imported
- Kimi P2 unclear on all skills → mock-heavy tests, unused deps, no BUILD_LOG

---

## 6. Recurring Issues Across All Runs

### 6a. Unused dependencies (4 of 7 runs)
| Run | Unused deps |
|---|---|
| kimi baseline | iron-session (imported, not used properly), uuid |
| kimi-skills v1 | supertest, @types/supertest, clsx |
| haiku v2 | supertest, autoprefixer, postcss, react, react-dom, tailwindcss, typescript |
| kimi P2 | diff, react-dom, tailwindcss, ws |

**Pattern:** Models install deps during planning phase based on what they think they'll need, then implement differently. The dep audit in Phase 5 catches this if run, but it's often skipped.

### 6b. Factories created but not used (3 of 5 completed runs)
| Run | Factory file exists | Actually imported |
|---|---|---|
| kimi-skills v1 | Yes | No |
| kimi-skills-v2 | Yes | No |
| opus-skills-v2 | Yes | **Yes** (7 files) |
| haiku-skills-v2 | Yes | Partial (2 files) |
| kimi P2 | Yes | Via helpers (indirect) |

**Pattern:** Models create the factory file because the skill says to, then forget about it when writing actual tests.

### 6c. Phase 5 self-review quality varies
| Run | BUILD_LOG complete | REVIEW present | Dep audit run | Lint check run |
|---|---|---|---|---|
| kimi-skills v1 | Partial (cut off Phase 2) | Yes | No | No |
| kimi-skills-v2 | Yes | Yes | Mentioned (pass) | Mentioned (pass) |
| opus-skills-v2 | Yes | Yes | Yes (react-dom only) | Yes (all pass) |
| haiku-skills-v2 | Partial (stalled Phase 3) | No | No | No |
| kimi P2 | **Missing entirely** | SELF_REVIEW present | No | No |

### 6d. Console statements (baselines only)
- kimi P1 baseline: 9 console.error
- kimi P2 baseline: 17 console.error
- All infra runs: zero

**This is a clear win.** The code-hygiene skill eliminates console statements completely.

### 6e. Session security (baselines only)
- kimi P1 baseline: unsigned base64 cookies (forgeable)
- kimi P2 baseline: `x-user-id` header for WebSocket auth (forgeable)
- All infra runs: proper iron-session with encrypted cookies

**Another clear win.** The security skill + session template eliminates session vulnerabilities.

---

## 7. Project-2 Specific Gaps (Kimi P2 analysis)

These gaps apply to any project beyond simple SQLite CRUD:

| Gap | What happened | Impact |
|---|---|---|
| **PostgreSQL test isolation** | Kimi mocked entire DB instead of using test database or transaction rollback | Mock-heavy tests verify mock wiring, not real behavior |
| **Concurrency/locking** | Lock acquire does DELETE then INSERT without transaction — race condition | Correctness bug under concurrent access |
| **WebSocket security** | Clients can broadcast fake `page:updated` / `lock:acquired` events | Server trusts client-sent state changes |
| **Search implementation** | `ILIKE '%query%'` instead of PostgreSQL full-text search | Can't use indexes, full table scan |
| **Response field selection** | Spread destructuring leaks future fields | Security risk as schema grows |

---

## 8. Template Effectiveness

Templates are the strongest compliance mechanism — models copy code structure more reliably than they follow prose instructions.

| Template | Compliance rate (all runs) | What it enforced |
|---|---|---|
| api-response.ts | **100%** — every run uses response helpers | Consistent {success, data, error} envelope |
| session.ts | **100%** — every run uses iron-session correctly | Encrypted cookies, two getter pattern |
| db-query.ts | **90%** — all use whitelist, Kimi P2 lost it for PostgreSQL | Column whitelisting for UPDATE/ORDER BY |
| api-route.ts | **90%** — consistent auth→validate→operate→respond | Route handler structure |
| validator.ts | **80%** — all use safeParse, varying depth | Zod schema patterns |
| component.tsx | **70%** — Haiku used `any` props, others followed | Named exports, typed props |
| api-route.test.ts | **60%** — Opus followed fully, Kimi partially | Factory imports, sealData auth |
| component.test.tsx | **50%** — testing depth varies widely | Component test patterns |

**Key finding:** Infra files closer to the "core" (response helpers, session, db) get higher compliance than testing templates. Models prioritize getting the app working over testing rigor.

---

## 9. What To Improve Next

### Immediate (skill/prompt improvements)
1. Embed top 5 rules directly in build prompt (not just in skills)
2. Add phase transition gates ("log 3 takeaways from the skill before proceeding")
3. Bake factory imports into the test template code
4. Add dep audit as an inline build prompt step, not just a skill section

### New skills needed
1. `validation-depth` — input caps, format regex, explicit field selection, error parity
2. `database-patterns` — PostgreSQL pool, transactions, atomic upserts, test isolation
3. `realtime-patterns` — WebSocket auth, server-authoritative events, message validation
4. `search-patterns` — FTS5, tsvector/GIN, ILIKE fallback, excerpt/highlight

### Structural changes
1. Better skill naming and descriptions for auto-triggering
2. Shorter skills with more code examples, less prose
3. Phase-specific skill bundles (don't make models read 3 skills at once)
4. Verification scripts that run automatically (not manually by the model)

---

## 10. Agent Identity & Pipeline Research (Session 4)

### Key research findings
- **Strong identity + "must NOT" constraints** outperform generic prompts (OpenHands CodeAct architecture)
- **Context rot is real** — every tested frontier model degrades with input length, even below context limits (Chroma 2025)
- **Minimal context per agent** — observation masking matched LLM summarization, 52% cheaper (JetBrains 2025)
- **Immutable artifacts** between pipeline steps prevent later agents undoing earlier work (GitHub 2025)
- **Multi-agent pipelines compound errors at 17x rate** when poorly designed (TDS 2025)
- **Self-orchestrated pipeline** (one model switching roles) has diluted adversarial benefit — same context window

### Agent-to-skill mapping (from AGENT_DESIGN_GUIDE.md)
| Agent | Skills it needs | Total |
|---|---|---|
| Planner | file-structure, env-config | 2 |
| Test Writer | test-factories, test-api-routes, test-components, test-error-paths, test-anti-patterns | 5 |
| Builder | api-route-pattern, session-auth, sql-safety, zod-validation, response-shaping, authorization, component-patterns, error-boundaries, env-config | 9 |
| Fixer | anti-patterns-code + relevant area skill | 1-2 |
| Reviewer | pre-flight-security, anti-patterns-code, anti-patterns-deps, dx-setup | 4 |

### Pipeline architecture variants designed
| Variant | Hypothesis | Expected outcome |
|---|---|---|
| Chunked | Clear acceptance criteria per chunk reduces missed features | +2-5 over flat prompt |
| Pipeline-chunked | QA/Builder role switch per chunk adds test quality | +1-3 over plain chunked |
| Iterative | Verify/fix cycle catches issues before they compound | +1-2 over pipeline-chunked |
| Full pipeline (batch) | Role switching with gates, batch TDD | Likely weaker than chunked due to overhead |

### Path issues continue
- v2 build-prompt.md said "path specified in CLAUDE.md" — CLAUDE.md didn't specify a path
- 40-minute run wasted, only produced package.json
- Fix: hardcode absolute paths in BOTH build prompt AND CLAUDE.md
- Lesson: never use indirection for paths. Always explicit absolute paths.

---

## 11. Future Experiments Planned

1. **Kimi self-chunks** — instead of Opus pre-defining chunks, let Kimi read the spec and create its own chunked plan. Tests whether the model's own decomposition beats an external one.
2. **True adversarial TDD** — Opus writes tests in one invocation, Kimi builds in a separate invocation. Separate context windows = genuine adversarial pressure.
3. **Mixed model pipeline** — Opus as Planner + Test Writer + Reviewer, Kimi as Builder + Fixer. Play to each model's strengths.
4. **Project 3 (★★★)** — Multi-Tenant Tracker. Tests if infra generalizes to the hardest spec.

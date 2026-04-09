# Skill Design Guide — Best Practices for Agent-Readable Skills

Reference this file when creating, editing, or reviewing skill files. These principles are derived from research on LLM instruction compliance and validated against 10+ benchmark runs across Opus, Kimi, and Haiku models.

---

## 1. One Skill = One Concern

A skill should cover exactly one topic. If you can't describe what the skill does in one sentence without "and," split it.

```
WRONG: "Session auth, SQL injection prevention, and input validation"
RIGHT: "iron-session encrypted cookie setup with two getter functions"
```

**Why:** Models activate skills based on what they're currently doing. When writing `lib/session.ts`, a model is thinking about sessions — not SQL injection. A combined skill loads SQL injection rules into context when they're irrelevant, wasting tokens and diluting attention.

**Target:** 35-70 lines per skill. Maximum 100 lines. If longer, it covers more than one concern.

---

## 2. Description = When + What (Keywords First)

The description field determines whether a skill activates. It must contain:
- **Technology/library keywords** that match imports and file names
- **Action verbs** that match what the model is doing
- **File paths** that match the working context

```
WRONG: 
  description: "Best practices for secure authentication implementation"
  (Too vague — "best practices" and "secure" don't match what the model is thinking)

RIGHT:
  description: "iron-session setup, bcrypt password hashing, encrypted cookie config. Use when creating lib/session.ts or implementing login/register/logout routes."
  (Keywords: iron-session, bcrypt, cookie, session.ts, login, register, logout)
```

**Test your description:** Would a developer searching for help with THIS specific file find this skill? If the model is writing `lib/validators.ts` and thinking "I need Zod schemas," would the description match?

---

## 3. Globs = Mechanical Triggers (95% activation)

Globs bypass model judgment entirely. When a file matches the glob pattern, the skill loads automatically. This is the most reliable activation method.

```yaml
# Specific file triggers
globs: "**/lib/session.ts,**/api/auth/**/route.ts"

# Pattern triggers
globs: "**/*.test.ts,**/*.test.tsx"

# Multiple contexts
globs: "**/lib/db.ts,**/db.ts"  # catches both path conventions
```

**Rules for globs:**
- Cover both common path conventions (`**/lib/db.ts` AND `**/db.ts`)
- Include test files if the skill has test-specific guidance
- Don't glob too broadly (`**/*.ts` would activate on every TypeScript file)
- Multiple skills CAN match the same file — that's fine, they address different concerns

---

## 4. Template First, Rules After

Models copy code structure with ~90% fidelity. They follow prose rules with ~60% fidelity. Structure every skill as:

1. **Code template** (the thing to copy) — 60-70% of the skill
2. **Rules** (numbered, max 5-7) — 20-30% of the skill
3. **Checklist** (if applicable) — 10% of the skill

```
WRONG order:
  ## Rules
  1. Always use safeParse...
  2. Never use string interpolation...
  ## Example (if you want to see one)
  ```typescript
  ...
  ```

RIGHT order:
  ## Pattern (copy this)
  ```typescript
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse(...);
  ```
  ## Rules
  1. Always .safeParse(). Never .parse().
```

**Why:** The model sees the code first and uses it as a structural anchor. Rules then constrain the copy. If rules come first, the model interprets them abstractly and may generate different code than intended.

---

## 5. Maximum 5-7 Rules Per Skill

Research findings:
- Weak models (Haiku, small Ollama): reliably follow **5 rules**
- Mid-tier models (Kimi, Sonnet): reliably follow **7 rules**
- Frontier models (Opus): reliably follow **12-15 rules**
- Beyond 15-20 simultaneous rules: **compliance cliff** — models start contradicting or ignoring rules

If you have more than 7 rules, you're covering more than one concern. Split the skill.

**Prioritize rules by violation frequency.** Put the most-commonly-violated rule first. From our benchmark data:
1. `any` types in component props (Haiku)
2. Factories created but not imported (Kimi)
3. `.parse()` instead of `.safeParse()` (Kimi baseline)
4. `console.error` in production code (Kimi baseline)
5. Spread destructuring in responses (Kimi v2)

---

## 6. Critical Rules Go in the System Prompt

Skills can be skipped — the model may not activate them, or may not read them fully. The 5-7 most important rules must ALSO appear in the build prompt / system prompt, where they're always in context.

From our data, these rules are always-critical:
1. Zero `any` types
2. Zero console statements
3. Always `.safeParse()`
4. Always response helpers (never manual `Response.json`)
5. Always column whitelist for dynamic SQL
6. Colocate tests
7. Run dep audit before finishing

These appear in `build-prompt.md` as "CRITICAL RULES" at the top — primacy effect ensures they're seen even if the model skims.

---

## 7. Phase Gates for Verification

Adding "before proceeding, confirm X in BUILD_LOG.md" increases compliance 20-30%. The model must restate what it learned, which forces actual reading.

```markdown
**Before proceeding to Phase 3, write in BUILD_LOG.md:**
- 3 security takeaways you will apply
- Confirm: "factories.ts exports build* and create*InDb functions"
- Confirm: "every test file imports from factories"
```

Without gates, models rush through phases (especially Phase 5 self-review). With gates, they prove they read the skill by articulating what they learned.

---

## 8. Naming Conventions

| Pattern | Example | When to use |
|---|---|---|
| `{topic}.md` | `sql-safety.md` | Single technology/concern |
| `{layer}-{pattern}.md` | `api-route-pattern.md` | Layer-specific pattern |
| `test-{what}.md` | `test-factories.md` | Test-specific skills |
| `{feature}-config.md` | `env-config.md` | Configuration setup |

**Names should be scannable.** A model seeing a list of 12 skill names should instantly know which one to read for its current task. Avoid generic names like `best-practices.md` or `guidelines.md`.

---

## 9. Skill Independence

Every skill must be usable without reading any other skill. No skill should say "see security.md for details" — if the information is needed, include it or the skill is scoped wrong.

**Test:** Can someone drop this single skill file into a project and get value? If it requires other skills to make sense, it's not independent.

---

## 10. Maintenance Rules

1. **Every rule must link to evidence.** Why does this rule exist? Which benchmark run showed the problem? Add a one-line comment if the rule isn't obvious.
2. **Retire rules that haven't been violated in 3+ consecutive runs.** Dead rules waste context.
3. **Update templates when the ecosystem changes.** If Next.js 15 changes the cookies() API, update the session-auth skill template.
4. **Version the skill set.** Don't mutate — create v3/ when making changes, compare scores.

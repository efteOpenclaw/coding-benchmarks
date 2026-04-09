# Infra v2 — Changelog

## What changed from v1

### Build prompt (completely rewritten)
- **7 critical rules at the top** — always in context, can't be missed even if skills are skipped
- **Phase gates** — model must log 3 takeaways + confirm checklist items before proceeding
- **One skill per phase** (not 2-3) — reduces cognitive load, especially for weaker models
- **Dep audit inline** — runs as a code block in Phase 5, not hidden in a skill section
- **Explicit field selection rule** with code example — prevents spread-destructuring leaks
- **Removed test-checklist as separate Phase 5 skill** — checklist now inline in build prompt

### Skills (restructured, not just edited)

**From 6 files → 4 files:**

| v1 | v2 | Change |
|---|---|---|
| architecture.md (384 lines) | architecture.md (95 lines) | Template-first, 7 rules max, glob trigger |
| security.md (398 lines) | security.md (100 lines) | Merged validation-depth patterns, 7 rules |
| code-hygiene.md (425 lines) | **Removed** — rules moved to build prompt | Top rules always in context |
| test-infrastructure.md (237 lines) | test-infrastructure.md (100 lines) | Stronger factory mandate, sealData template |
| test-writing.md (290 lines) | test-writing.md (90 lines) | Template-first, test category checklist |
| test-checklist.md (102 lines) | **Removed** — checklist moved to build prompt Phase 5 | Always in context at review time |

**Design principles applied:**
- Every skill starts with a code template to copy, then rules (max 7)
- Glob patterns for mechanical triggering (when available)
- Skills average ~95 lines (v1 averaged ~310 lines)
- Total skill content: ~385 lines (v1: ~1,836 lines — 79% reduction)
- No skill requires reading another skill first

### What was removed vs moved

| Content | v1 location | v2 location | Why moved |
|---|---|---|---|
| Zero console rule | code-hygiene skill | Build prompt critical rules #2 | Must be always-visible |
| Zero any rule | code-hygiene skill | Build prompt critical rules #1 | Must be always-visible |
| safeParse rule | security skill | Build prompt critical rules #3 | Must be always-visible |
| Response helpers rule | code-hygiene skill | Build prompt critical rules #4 | Must be always-visible |
| Column whitelist rule | security skill | Build prompt critical rules #5 | Must be always-visible |
| Colocate tests rule | test-checklist | Build prompt critical rules #6 | Must be always-visible |
| Dep audit | code-hygiene skill | Build prompt Phase 5 (inline script) | Must run, not just be read |
| Pre-flight checklist | test-checklist | Build prompt Phase 5 (inline) | Phase 5 gets skipped least when checklist is in the prompt |

### Templates and rules (unchanged from v1)
- 8 templates carried forward (api-response, api-route, api-route.test, component, component.test, db-query, session, validator)
- 4 rule files carried forward (api-routes, components, data-access, tests)
- lint/check.sh carried forward

### Evidence basis for changes
- See /app/analysis/FINDINGS.md for full data
- Skill compliance: Opus read 6/6, Kimi read 5/6, Haiku read 1/6
- Template compliance: 90% average vs 60% for prose rules
- Research: weak models follow 5-7 concurrent rules; cliff at 15-20
- Research: checklists get 85% compliance vs 55% for prose
- Research: instructions at top/bottom of context get highest compliance

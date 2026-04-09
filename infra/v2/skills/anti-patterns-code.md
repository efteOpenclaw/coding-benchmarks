---
name: anti-patterns-code
description: Common code mistakes that cause rubric penalties — spread destructuring responses, any types on props, console.error as error handling, .parse() instead of .safeParse(), manual Response.json. Use as a negative checklist when writing any source file.
globs: "**/src/**/*.ts,**/src/**/*.tsx"
---

# Code Anti-Patterns — What Costs Points

These are the most frequent penalties across all benchmark runs. Check each one.

| Anti-Pattern | Penalty | What to do instead |
|---|---|---|
| **`}: any)` on component props** | -3 | Explicit `interface Props { ... }` above the component |
| **`console.error` in catch blocks** | -5 (if many) | Return `errorResponse(...)` — the framework logs errors |
| **`console.error` for startup failures** | -1 | `throw new Error(...)` — Next.js surfaces it |
| **`.parse()` on user input** | -2 | `.safeParse()` + check `result.success` |
| **Spread to strip fields** `{ password_hash, ...rest }` | -0 (now) | Explicit field selection: `{ id: user.id, email: user.email }` |
| **Manual `Response.json()`** in route handlers | -1 | Use `successResponse()` / `errorResponse()` helpers |
| **`hashSync` / `compareSync`** | -0 (nit) | `await bcrypt.hash()` / `await bcrypt.compare()` — non-blocking |
| **URL regex for route params** | -1 | Use Next.js `{ params }` convention: `{ params: Promise<{ id: string }> }` |

## The pattern: models take shortcuts under pressure

These aren't random mistakes — they're shortcuts models take when running low on context or time:
- `}: any)` is faster than defining a Props interface
- `console.error(err)` is the first thing that comes to mind in a catch block
- `.parse()` is one word shorter than `.safeParse()` + the success check
- Spread destructuring is one line vs explicit field selection

The shortcut always costs more points than it saves time. When in doubt, use the template.

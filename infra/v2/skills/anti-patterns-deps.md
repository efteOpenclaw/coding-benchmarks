---
name: anti-patterns-deps
description: Unused dependency detection and prevention — install only what you import, audit before finishing, prefer built-ins over packages. Use during Phase 5 review or when running npm install.
globs: "**/package.json"
---

# Dependency Anti-Patterns — What Gets Installed But Never Used

## The pattern

Models install dependencies during the planning phase based on what they think they'll need, then implement differently. Every benchmark run except Opus v2 had unused deps.

| Commonly installed but unused | Why it happens | What to do |
|---|---|---|
| `supertest` | Planned for API tests, used direct handler calls instead | Don't install until you actually `import` it |
| `clsx` | Planned for conditional classes, used template literals | Tailwind classes don't need clsx for simple conditionals |
| `uuid` | Planned for ID generation, `crypto.randomUUID()` works | Always prefer built-in over package |
| `diff` | Planned for revision diffs, never implemented the diff view | Don't install for features you haven't built yet |
| `tailwindcss` in wrong section | Framework dep listed but CSS handled by build config | Check if the framework handles it |

## Audit script (run this in Phase 5)

```bash
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -rq "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx" && \
     ! grep -rq "require(['\"]${dep}" src/ --include="*.ts" --include="*.tsx"; then
    echo "UNUSED: ${dep}"
  fi
done
```

**If anything shows up: `npm uninstall <package>` immediately.**

## Prefer built-ins

| Instead of | Use |
|---|---|
| `uuid` | `crypto.randomUUID()` |
| `lodash.clonedeep` | `structuredClone()` |
| `node-fetch` | Global `fetch` |
| `dotenv` | Next.js loads `.env` automatically |

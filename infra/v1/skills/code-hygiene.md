---
name: code-hygiene
description: Production readiness and code cleanliness. Use when finalizing code for production, cleaning up dependencies, configuring TypeScript, organizing imports, writing error responses, setting up package.json scripts, creating README files, or preparing .env.example files. Covers console removal, unused dependency detection, barrel export avoidance, and DX setup.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Code Hygiene Skill — Production Readiness

You are preparing a fullstack application for production. Follow this guide to ensure clean, maintainable, production-ready code.

---

## 1. No Console Statements in Production Code

`console.log` and `console.error` are unstructured, unsearchable, and can leak internal details.

### Rule: Zero console statements in source code

```typescript
// WRONG — in any route handler or component
console.error("Login error:", error);

// RIGHT — return proper error response, no logging
return Response.json(
  { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
  { status: 500 }
);
```

If structured logging is needed, use a logger library (pino) — but for most projects, proper error responses are sufficient. The server framework logs errors automatically.

### What about startup errors?

For startup validation failures (env vars, config), **throw** — don't `console.error + process.exit`:

```typescript
// WRONG — console.error triggers the lint rule
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid env:", parsed.error);  // violates zero-console rule
  process.exit(1);
}

// RIGHT — throw, let the framework surface it
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${
      parsed.error.issues.map(i => `  ${i.path}: ${i.message}`).join('\n')
    }\nSee .env.example for required values.`
  );
}
```

Thrown errors surface in Next.js dev server output and build logs automatically — no console statements needed.

### How to verify

Search the entire source for console statements before finalizing:

```bash
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test."
```

This should return zero results. Console in test files is acceptable (for debugging during development).

---

## 2. No Unused Dependencies

Every dependency in `package.json` must be imported somewhere in source code.

### Common offenders

| Symptom | Example | Fix |
|---------|---------|-----|
| Listed but never imported | `iron-session` in deps but custom session code used instead | Either use it properly or remove it |
| Redundant with built-in | `uuid` package when `crypto.randomUUID()` works | Remove the package, use the built-in |
| Dev dep in production deps | `@types/node` in `dependencies` instead of `devDependencies` | Move to `devDependencies` |
| Leftover from refactoring | Package was used, code changed, package remained | Remove it |

### Post-build dependency audit (mandatory)

After all code is written, run this check. It must return zero results:

```bash
# Check each dependency is actually imported
for dep in $(node -e "console.log(Object.keys(require('./package.json').dependencies || {}).join('\n'))"); do
  if ! grep -r "from ['\"]${dep}" src/ --include="*.ts" --include="*.tsx" -q && \
     ! grep -r "require(['\"]${dep}" src/ --include="*.ts" --include="*.tsx" -q; then
    echo "UNUSED: ${dep}"
  fi
done

# Do the same for devDependencies (exclude @types/ — they're used implicitly)
for dep in $(node -e "console.log(Object.keys(require('./package.json').devDependencies || {}).filter(d => !d.startsWith('@types/')).join('\n'))"); do
  if ! grep -r "from ['\"]${dep}" src/ tests/ --include="*.ts" --include="*.tsx" -q && \
     ! grep -r "require(['\"]${dep}" src/ tests/ --include="*.ts" --include="*.tsx" -q && \
     ! grep -r "\"${dep}\"" vitest.config.ts -q 2>/dev/null; then
    echo "UNUSED DEV: ${dep}"
  fi
done
```

If a dependency is unused, remove it: `npm uninstall <package>`

Common causes of unused deps:
- Planned to use a library but implemented differently (e.g., `supertest` planned but direct handler calls used instead)
- Installed a utility "just in case" (e.g., `clsx`) but never needed it
- Copy-pasted a dependency list from a plan without pruning after build

### Prefer built-ins over packages

| Instead of | Use |
|-----------|-----|
| `uuid` | `crypto.randomUUID()` (Node.js 19+, Next.js 14+ requires Node 18+) |
| `lodash.clonedeep` | `structuredClone()` |
| `node-fetch` | Global `fetch` (Node.js 18+) |
| `dotenv` | Next.js loads `.env` files automatically |

---

## 3. No Default Exports (with Next.js exceptions)

Use named exports everywhere. Default exports make refactoring harder and imports inconsistent.

```typescript
// WRONG
export default function TaskForm() { ... }

// RIGHT
export function TaskForm() { ... }
```

### Exception: Next.js App Router conventions

Next.js **requires** `export default` for these specific files:
- `page.tsx` — route pages
- `layout.tsx` — layouts
- `error.tsx` — error boundaries
- `loading.tsx` — loading states
- `not-found.tsx` — 404 pages

Named exports are required for everything else (components, lib, utils, API route handlers).

---

## 4. No Barrel Exports

Barrel files (`index.ts` that re-exports from other files) harm bundle size, dev server performance, and create circular dependency risks.

```typescript
// BAD — components/index.ts
export { Button } from "./Button";
export { Modal } from "./Modal";
export { DataTable } from "./DataTable"; // 50KB pulled in even if unused

// GOOD — direct imports
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
```

### Exception

Type-only barrels are acceptable since TypeScript erases them at compile time:

```typescript
// types/index.ts — OK because these are erased at build
export type { User } from "./user";
export type { Task } from "./task";
```

But even for types, direct imports are preferred.

---

## 5. Consistent Error Response Shape

Every API route must return the same shape for errors:

```typescript
// lib/api-response.ts
export function success<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function error(code: string, message: string, status: number) {
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}
```

### Always use the helpers — never construct responses manually

Once you create response helpers, use them in **every** route handler — including catch blocks:

```typescript
// WRONG — manual construction, even if shape matches
catch (err) {
  return Response.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 }
  );
}

// RIGHT — always use the helper
catch (err) {
  return Response.json(error("INTERNAL_ERROR", "Internal server error"), { status: 500 });
}
```

A single manual construction is a drift seed — the next file will copy the pattern instead of the helper.

### Standard error codes

| Code | HTTP Status | When |
|------|------------|------|
| `VALIDATION_ERROR` | 400 | Invalid input (Zod failure) |
| `UNAUTHORIZED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Authenticated but not authorized (use sparingly — prefer 404) |
| `NOT_FOUND` | 404 | Resource doesn't exist or user doesn't own it |
| `CONFLICT` | 409 | Duplicate resource (e.g., email already registered) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 6. TypeScript Configuration

### Minimum strict config

```jsonc
{
  "compilerOptions": {
    "strict": true,                          // enables all strict checks
    "noUncheckedIndexedAccess": true,        // array[0] is T | undefined
    "forceConsistentCasingInFileNames": true, // prevent cross-OS bugs
    "isolatedModules": true,                 // required for Next.js/SWC
    "noEmit": true,
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Zero `any` types

- Never use `any` explicitly.
- Use `unknown` when the type is genuinely unknown, then narrow with type guards or Zod.
- Use `as` casts only when you can prove the shape matches (e.g., Zod-validated data, DB return types).
- Prefer `Record<string, unknown>` over `Record<string, any>`.

---

## 7. Developer Experience Setup

### .env.example (always provide)

```bash
# .env.example — committed to git
# Copy to .env.local and fill in values

# Generate with: openssl rand -base64 32
SESSION_SECRET=generate-a-32-char-secret-here

# Database
DATABASE_URL=file:./data/app.db

# Environment
NODE_ENV=development
```

Every variable must have a comment explaining its purpose.

### package.json scripts

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "next lint && tsc --noEmit"
  }
}
```

Every project needs at minimum: `dev`, `build`, `start`, `test`, `lint`.

### README.md

A new developer must be productive within 15 minutes. Include:

```markdown
# Project Name

One-sentence description.

## Setup

npm install
cp .env.example .env.local    # fill in values
npm run dev                    # http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run lint` | Lint + typecheck |

## Architecture

- `src/app/` — Next.js pages and API routes
- `src/lib/` — Database, auth, validation
- `src/components/` — React components
```

---

## 8. File Organization

### Next.js App Router conventions

```
src/
  lib/              # Business logic, DB, validation, session
  components/       # React components (no barrel exports)
  app/
    layout.tsx      # Root layout
    page.tsx        # Home page
    error.tsx       # Error boundary
    globals.css     # Tailwind imports
    api/            # Route handlers
      auth/
        register/route.ts
        login/route.ts
        logout/route.ts
        me/route.ts
      tasks/
        route.ts
        [id]/route.ts
    login/page.tsx
    register/page.tsx
    tasks/page.tsx
```

### Rules

- Server Components by default, `"use client"` only when needed (state, effects, event handlers).
- Colocate tests with source: `db.ts` → `db.test.ts` in the same directory.
- No `utils.ts` dumping grounds — name files for what they do (`validators.ts`, `db.ts`, `session.ts`).
- Keep files under 200 lines. If a file is growing, split by responsibility.

---

## 9. Server vs Client Components

### Decision guide

| Needs | Component type |
|-------|---------------|
| Database access, session reading, async data fetching | Server Component |
| `useState`, `useEffect`, event handlers, browser APIs | Client Component (`"use client"`) |
| Static layout, metadata, rendering children | Server Component |
| Forms with validation feedback, interactive UI | Client Component |

### Idiomatic pattern: server shell + client child

```typescript
// app/tasks/page.tsx — Server Component
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { TasksPageClient } from "./TasksPageClient";

export default async function TasksPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  return <TasksPageClient />;
}

// app/tasks/TasksPageClient.tsx — Client Component
"use client";
export function TasksPageClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  // ... interactive UI
}
```

This gives you server-side auth checks with client-side interactivity.

---

## 10. Pre-Flight Hygiene Checklist

Before marking code as complete, verify every item:

```
□ Zero console.log/console.error in source code (grep to verify)
□ Startup errors use throw, not console.error + process.exit
□ Unused dependency audit passes (run the script from section 2 — zero results)
□ Zero `any` types (grep for ": any" and "as any")
□ No default exports except Next.js pages/layouts/error boundaries
□ No barrel exports (no index.ts re-export files)
□ All routes use response helpers — no manual Response.json construction
□ .env.example provided with all variables documented
□ .gitignore includes .env*, *.db, node_modules/, .next/
□ package.json has dev, build, start, test, lint scripts
□ README.md with setup instructions, scripts table, architecture overview
□ TypeScript strict mode enabled
□ Server Components by default, "use client" only when necessary
□ Files under 200 lines, named for their purpose
□ Tests colocated with source files
□ next build succeeds with zero errors
□ npx vitest run passes all tests
```

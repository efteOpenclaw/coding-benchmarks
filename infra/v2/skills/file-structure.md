---
name: file-structure
description: Three-layer file organization for Next.js App Router. Use when creating PLAN.md, deciding where to put new files, or setting up the project directory.
globs: "**/PLAN.md"
---

# File Structure — Three-Layer Next.js App Router

```
src/
├── lib/                    # Data access — ALL SQL here, nowhere else
│   ├── db.ts               # Database connection + typed query functions
│   ├── session.ts           # iron-session config
│   ├── validators.ts        # Zod schemas + z.infer type exports
│   └── api-response.ts      # successResponse / errorResponse helpers
├── components/              # Presentation — no SQL, no fetch, no DB imports
│   ├── TaskForm.tsx         # 'use client' only if needs state/events
│   └── TaskList.tsx
└── app/
    ├── api/                 # API routes — glue only: auth → validate → db call → respond
    │   └── tasks/route.ts
    ├── tasks/
    │   ├── page.tsx         # Server Component (auth guard, redirect)
    │   └── TasksClient.tsx  # Client Component (state, interactivity)
    ├── layout.tsx           # Root layout
    └── error.tsx            # Error boundary
```

## Rules

1. Each layer calls only the layer below. Components → API → Data access.
2. All SQL in `lib/db.ts`. Never in routes or components.
3. Named exports only (`export function X`). Never `export default` except pages/layouts/error (Next.js requires it).
4. No barrel exports. No `index.ts` re-export files.
5. Colocate tests: `db.ts` → `db.test.ts` in same directory.

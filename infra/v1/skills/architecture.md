---
name: architecture
description: Fullstack app architecture patterns. Use when designing file structure, API routes, data access layers, component hierarchies, or deciding between server and client components. Covers separation of concerns, RESTful API design, database layer patterns, and Next.js App Router conventions.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Architecture Skill — Fullstack Applications

You are designing the architecture for a fullstack application. Follow this guide to create clean, maintainable structures with proper separation of concerns.

---

## 1. Layered Architecture

### Three distinct layers

```
┌─────────────────────────────────┐
│  Presentation Layer             │  Pages, components, layouts
│  (app/, components/)            │  Renders UI, handles user interaction
├─────────────────────────────────┤
│  API Layer                      │  Route handlers
│  (app/api/)                     │  Validates input, calls data layer, returns responses
├─────────────────────────────────┤
│  Data Access Layer              │  Database operations, business logic
│  (lib/)                         │  SQL queries, domain rules, session management
└─────────────────────────────────┘
```

### Rule: Each layer only calls the layer below it

- Components call API routes via `fetch` (client) or import data functions directly (server).
- API routes call data access functions. They never contain SQL.
- Data access functions execute SQL. They never import from `next/server`.

### Why this matters

You should be able to swap the database without touching any component or API route. You should be able to change the UI framework without touching any data function.

---

## 2. Data Access Layer

### Typed wrapper functions over raw SQL

```typescript
// lib/db.ts
import Database from "better-sqlite3";

const db = new Database(process.env.DATABASE_URL ?? "./data/app.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Schema initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Typed row interfaces
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

// Typed functions — the only place SQL exists
export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
}

export function createUser(id: string, email: string, passwordHash: string): UserRow {
  return db.prepare(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?) RETURNING *"
  ).get(id, email, passwordHash) as UserRow;
}
```

### Rules

- One file for all database operations (`lib/db.ts`) or split by domain (`lib/db/users.ts`, `lib/db/tasks.ts`).
- Every function has a typed return value.
- SQL only appears in this layer — never in route handlers or components.
- Parameterized queries only — never string concatenation.
- Enable WAL mode and foreign keys at connection time.
- Add indexes on frequently queried columns (foreign keys, status, created_at).

---

## 3. API Route Design

### RESTful conventions

| Method | Path | Purpose | Success Status |
|--------|------|---------|---------------|
| POST | /api/resources | Create | 201 |
| GET | /api/resources | List | 200 |
| GET | /api/resources/:id | Get one | 200 |
| PATCH | /api/resources/:id | Partial update | 200 |
| DELETE | /api/resources/:id | Delete | 200 |

### Route handler structure

Every route handler follows the same pattern:

```typescript
// app/api/tasks/route.ts
import { getSession } from "@/lib/session";
import { createTaskSchema } from "@/lib/validators";
import { createTask, getTasksByUserId } from "@/lib/db";

export async function GET(request: Request) {
  try {
    // 1. Auth check
    const session = await getSession();
    if (!session.userId) {
      return Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    // 2. Input validation (query params, if any)
    const url = new URL(request.url);
    const filters = taskQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!filters.success) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: filters.error.issues[0].message } },
        { status: 400 }
      );
    }

    // 3. Data operation
    const tasks = getTasksByUserId(session.userId, filters.data);

    // 4. Response
    return Response.json({ success: true, data: { tasks } });
  } catch (error) {
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
```

### Consistent response shape

Every response, success or error, uses the same structure:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

### Route handler rules

- Always wrap in try/catch.
- Always check auth first.
- Always validate input with Zod.
- Always use response helpers (`success()`, `error()`) — never construct `Response.json({ success: ... })` manually. Create the helpers in `lib/api-response.ts` and use them in every handler, including catch blocks. One manual construction becomes a drift seed that gets copied.
- Never put business logic in the route handler — call data layer functions.
- Never return raw database rows — strip sensitive fields (password_hash, internal IDs).
- Use proper HTTP status codes (201 for creation, 404 for not found, etc.).

---

## 4. Component Architecture

### Hierarchy pattern: Server shell + Client interactivity

```
RootLayout (server)
├── / (page, server) — redirect based on auth
├── /login (page)
│   └── LoginForm (client) — form state, submit handler
├── /register (page)
│   └── RegisterForm (client) — form state, submit handler
└── /tasks (page, server) — auth guard, redirect if unauthenticated
    └── TasksPage (client) — fetches tasks, manages state
        ├── FilterBar (client) — filter/sort controls
        ├── TaskForm (client) — create new task
        ├── TaskList (client)
        │   └── TaskItem[] (client) — display, edit, delete
        │       └── ConfirmDialog (client) — delete confirmation
        └── EmptyState — shown when no tasks
```

### Component design rules

1. **Single responsibility** — Each component does one thing.
2. **Props down, callbacks up** — Data flows down via props, actions flow up via callback props.
3. **No god components** — If a component exceeds ~150 lines, split it.
4. **Name for purpose** — `FilterBar`, not `Controls`. `TaskItem`, not `Item`.
5. **Colocate related files** — Component, test, and styles in the same directory.

### Server vs Client decision

```
Need useState, useEffect, onClick, onChange?     → Client ("use client")
Need database access, session, async data fetch? → Server
Just rendering children with no interactivity?   → Server
```

---

## 5. File Organization

### Standard Next.js App Router structure

```
src/
├── lib/
│   ├── db.ts                  # Database operations (all SQL lives here)
│   ├── db.test.ts             # Database tests
│   ├── session.ts             # Session management (iron-session config)
│   ├── validators.ts          # Zod schemas
│   ├── validators.test.ts     # Validator tests
│   ├── api-response.ts        # Response helper functions
│   └── env.ts                 # Environment variable validation
├── components/
│   ├── AuthForm.tsx           # Login/register form
│   ├── AuthForm.test.tsx      # Colocated test
│   ├── TaskForm.tsx           # Task creation form
│   ├── TaskForm.test.tsx
│   ├── TaskList.tsx           # Task list display
│   ├── TaskList.test.tsx
│   ├── TaskItem.tsx           # Individual task
│   ├── FilterBar.tsx          # Filter/sort controls
│   └── ConfirmDialog.tsx      # Delete confirmation
├── app/
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home redirect
│   ├── globals.css            # Tailwind imports
│   ├── error.tsx              # Error boundary
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── tasks/
│   │   ├── page.tsx           # Server component (auth guard)
│   │   ├── TasksPageClient.tsx # Client component (interactive)
│   │   └── error.tsx          # Tasks error boundary
│   └── api/
│       ├── auth/
│       │   ├── register/
│       │   │   ├── route.ts
│       │   │   └── route.test.ts
│       │   ├── login/
│       │   │   ├── route.ts
│       │   │   └── route.test.ts
│       │   ├── logout/
│       │   │   ├── route.ts
│       │   │   └── route.test.ts
│       │   └── me/
│       │       ├── route.ts
│       │       └── route.test.ts
│       └── tasks/
│           ├── route.ts
│           ├── route.test.ts
│           └── [id]/
│               ├── route.ts
│               └── route.test.ts
└── test/
    └── setup.ts               # Test setup file
```

### Organization rules

- **lib/** for business logic — no UI imports here.
- **components/** for reusable UI — no database imports here.
- **app/** for routing and page assembly.
- **app/api/** for route handlers — thin wrappers that call lib functions.
- **Tests colocated** with source: `file.ts` → `file.test.ts` in the same directory.
- **No barrel exports** — import directly from the file.
- **No `utils.ts`** — name files for their purpose.

---

## 6. Error Boundaries

### Place error boundaries at layout levels

```typescript
// app/error.tsx — Root error boundary
"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <button
          onClick={reset}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// app/tasks/error.tsx — Section-level error boundary
"use client";

export default function TasksError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4">
      <p className="text-red-800">Failed to load tasks</p>
      <button onClick={reset} className="mt-2 text-red-600 underline">
        Retry
      </button>
    </div>
  );
}
```

Error boundaries catch errors in their subtree. Place them at meaningful boundaries (root, per-section) so a failure in one section doesn't crash the whole app.

---

## 7. Dependency Selection

### Choose the minimal set

Before adding a dependency, ask:
1. Can this be done with a built-in? (`crypto.randomUUID()` vs `uuid`, `fetch` vs `axios`)
2. Is this required by the spec?
3. Does this have a small footprint?

### Document every dependency

In your PLAN.md, list each dependency with a one-line justification:

```
- better-sqlite3: SQLite driver (spec-required, no ORM)
- iron-session: Encrypted cookie sessions (spec-required)
- bcryptjs: Password hashing (spec-required)
- zod: Runtime validation (spec-required)
```

If you can't justify why a dependency exists, remove it.

---

## 8. Architecture Checklist

Before starting implementation, verify your plan includes:

```
□ Clear three-layer separation (presentation → API → data access)
□ All SQL confined to lib/db.ts (or lib/db/*.ts)
□ Typed wrapper functions for every database operation
□ Consistent API response shape defined
□ Every route follows: auth check → validate → data operation → respond
□ Server components by default, client only for interactivity
□ Error boundaries at root and section levels
□ File tree with colocated tests
□ No barrel exports planned
□ Every dependency justified
□ Database indexes on foreign keys and frequently filtered columns
□ WAL mode and foreign keys enabled
```

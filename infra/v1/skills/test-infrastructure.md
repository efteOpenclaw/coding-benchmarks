---
name: test-infrastructure
description: Test infrastructure setup for fullstack apps. Use when configuring Vitest, creating test factories, setting up helpers for auth mocking, database isolation, or NextRequest creation. Read this BEFORE writing any test files.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Test Infrastructure — Setup Before Writing Tests

Set up your test infrastructure first. Every test file depends on this foundation.

---

## 1. Test Architecture: The Testing Trophy

For fullstack web apps, use the **Testing Trophy** (not the pyramid):

```
        ┌─────────┐
        │  E2E    │  ← Few: critical user journeys only
       ┌┴─────────┴┐
       │Integration │  ← Most: API routes, component+state, DB operations
      ┌┴────────────┴┐
      │  Unit Tests   │  ← Some: pure functions, validators, utilities
     ┌┴───────────────┴┐
     │  Static Analysis │  ← TypeScript strict mode, ESLint
     └─────────────────┘
```

| Layer | What to test | Examples |
|-------|-------------|----------|
| **Static** | Types, imports, syntax | `tsconfig.json` strict mode, ESLint rules |
| **Unit** | Pure functions, validators, formatters | Zod schemas, date formatting |
| **Integration** | API routes with real DB, components with state | Route handler → DB → response |
| **E2E** | Critical user journeys | Register → login → create item → logout |

---

## 2. Test File Organization

**Colocate tests with source. Always.**

```
src/
  lib/
    validators.ts
    validators.test.ts          ← colocated
    db.ts
    db.test.ts                  ← colocated
  components/
    TaskCard.tsx
    TaskCard.test.tsx            ← colocated
  app/api/tasks/
    route.ts
    route.test.ts               ← colocated
tests/
  helpers/
    setup.ts                    ← shared setup
    factories.ts                ← test data factories
    auth.ts                     ← auth mocking helpers
```

**Why colocate:** Deleted source = deleted tests. No orphaned test files.

---

## 3. Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/helpers/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    pool: "threads",
    isolate: true,
  },
});
```

---

## 4. Setup File

```typescript
// tests/helpers/setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

---

## 5. Test Data Factories (mandatory)

Use factory functions with sensible defaults. **Never hardcode IDs or data directly in tests.**

```typescript
// tests/helpers/factories.ts
import { randomUUID } from "crypto";

export function buildUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    email: overrides.email ?? `user-${id.slice(0, 8)}@test.com`,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  };
}

// "build" returns an object (unit tests)
// "create" persists to DB (integration tests)
export function createUser(overrides: Partial<User> = {}): User {
  const data = buildUser(overrides);
  return db.insertUser(data);
}
```

**Rules:**
- Each test creates its own data via factories — mandatory, not optional
- Never rely on data from a previous test
- Use `build()` for unit tests (no DB), `create()` for integration tests
- Never hardcode IDs or email addresses directly in tests

```typescript
// WRONG — hardcoded IDs create hidden coupling
createUser("user-1", "test@example.com", "hash");
createTask({ id: "task-1", userId: "user-1", title: "Task" });

// RIGHT — factories generate unique IDs, tests only specify what matters
const user = createUser();
const task = createTask({ userId: user.id });
```

If you created a `factories.ts` file, you must actually import and use it in your tests. Do not create factory infrastructure and then bypass it with raw data.

---

## 6. Authenticated Request Helpers

```typescript
// tests/helpers/auth.ts

// Pattern 1: Mock the session module
export function mockAuthenticated(user = buildUser()) {
  vi.mock("@/lib/session", () => ({
    getSessionUserId: vi.fn().mockResolvedValue(user.id),
  }));
  return user;
}

export function mockUnauthenticated() {
  vi.mock("@/lib/session", () => ({
    getSessionUserId: vi.fn().mockResolvedValue(null),
  }));
}

// Pattern 2: For iron-session, seal a real cookie
import { sealData } from "iron-session";

export async function createSessionCookie(userId: string): Promise<string> {
  const sealed = await sealData(
    { userId },
    { password: process.env.SESSION_SECRET!, ttl: 3600 }
  );
  return `session=${sealed}`;
}
```

---

## 7. NextRequest Helpers

```typescript
// tests/helpers/next-request.ts
import { NextRequest } from "next/server";

export function createRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
) {
  const url = new URL(path, "http://localhost:3000");
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }
  return new NextRequest(url, {
    method: options.method ?? "GET",
    headers: new Headers(options.headers ?? {}),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}
```

---

## 8. Database Test Isolation

**SQLite (in-memory):**
```typescript
beforeEach(() => {
  db = new Database(":memory:");
  db.exec(SCHEMA_SQL);
});

afterEach(() => {
  db.close();
});
```

**Or resetDb pattern:**
```typescript
beforeEach(() => {
  resetDb(); // DELETE FROM tasks; DELETE FROM users;
});
```

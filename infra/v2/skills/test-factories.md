---
name: test-factories
description: Test data factory functions — buildUser/buildTask for unit tests, createUserInDb/createTaskInDb for integration tests, auth cookie helper with sealData. Use when creating tests/helpers/factories.ts or any test helper.
globs: "**/tests/helpers/**,**/test/helpers/**,**/factories.*,**/helpers/auth.*"
---

# Test Factories — Build and Create Helpers

## Factory file (copy and adapt)

```typescript
// tests/helpers/factories.ts
import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import { getDb } from '@/lib/db';

const TEST_HASH = hashSync('password123', 10);

// build* = plain objects (no DB)
export function buildUser(overrides: Partial<UserRow> = {}): UserRow {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    email: overrides.email ?? `user-${id.slice(0, 8)}@test.com`,
    password_hash: overrides.password_hash ?? TEST_HASH,
    created_at: overrides.created_at ?? new Date().toISOString(),
    ...overrides,
  };
}

// create*InDb = persisted to database
export function createUserInDb(overrides: Partial<UserRow> = {}): UserRow {
  const user = buildUser(overrides);
  getDb().prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(user.id, user.email, user.password_hash, user.created_at);
  return user;
}
```

## Auth cookie helper

```typescript
// tests/helpers/auth.ts
import { sealData } from 'iron-session';

export async function createAuthCookie(userId: string): Promise<string> {
  const sealed = await sealData({ userId }, {
    password: process.env.SESSION_SECRET ?? 'dev-secret-at-least-32-characters-long-here',
    ttl: 3600,
  });
  return `app-session=${sealed}`;
}
```

## Rules

1. Every test file MUST import from factories — never hardcode `createUser("user-1", "test@example.com", "hash")`.
2. `build*` for unit tests (no DB). `create*InDb` for integration tests (persisted).
3. Use a single pre-computed `TEST_HASH` — no `hashSync` per test (slow).
4. Use `randomUUID()` in factories — never hardcoded IDs.
5. Use `sealData` for real auth cookies — never mock the session module.

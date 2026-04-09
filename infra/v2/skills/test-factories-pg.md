---
name: test-factories-pg
description: Test data factories for PostgreSQL projects — async createUserInDb, createPageInDb, createRevisionInDb, createLockInDb. Use when creating test helpers for PostgreSQL-backed tests.
globs: "**/tests/helpers/**,**/test/helpers/**,**/factories.*"
---

# Test Factories — PostgreSQL Projects

## Factory file (copy and adapt)

```typescript
// tests/helpers/factories.ts
import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import { getPool, initDb } from '@/lib/db';

const TEST_HASH = hashSync('password123', 10);

// build* = plain objects (no DB)
export function buildUser(overrides: Partial<UserRow> = {}): UserRow {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    email: overrides.email ?? `user-${id.slice(0, 8)}@test.com`,
    password_hash: TEST_HASH,
    display_name: overrides.display_name ?? `User ${id.slice(0, 4)}`,
    avatar_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildPage(overrides: Partial<PageRow> = {}): PageRow {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    slug: overrides.slug ?? `page-${id.slice(0, 8)}`,
    title: overrides.title ?? `Page ${id.slice(0, 4)}`,
    parent_id: null,
    created_by: overrides.created_by ?? randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// create*InDb = async, persisted to PostgreSQL
export async function createUserInDb(overrides: Partial<UserRow> = {}): Promise<UserRow> {
  const user = buildUser(overrides);
  await getPool().query(
    'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
    [user.id, user.email, user.password_hash, user.display_name]
  );
  return user;
}

export async function createPageInDb(params: {
  title?: string; slug?: string; created_by: string;
  content_markdown?: string; parent_id?: string | null;
}): Promise<PageRow> {
  const id = randomUUID();
  const slug = params.slug ?? params.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? `page-${id.slice(0, 8)}`;
  const { rows } = await getPool().query(
    'INSERT INTO pages (id, slug, title, parent_id, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id, slug, params.title ?? `Page ${id.slice(0, 4)}`, params.parent_id ?? null, params.created_by]
  );
  // Also create initial revision
  const content = params.content_markdown ?? `# ${params.title ?? 'New Page'}`;
  await getPool().query(
    'INSERT INTO page_revisions (id, page_id, content_markdown, content_html, edited_by) VALUES ($1, $2, $3, $4, $5)',
    [randomUUID(), id, content, `<h1>${params.title ?? 'New Page'}</h1>`, params.created_by]
  );
  return rows[0] as PageRow;
}
```

## Auth cookie helper (same as P1)

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

## Test setup pattern

```typescript
// tests/helpers/setup.ts
import { getPool, initDb, closePool } from '@/lib/db';

beforeAll(async () => {
  await initDb();
});
afterEach(async () => {
  await getPool().query('TRUNCATE users, pages, page_revisions, page_locks CASCADE');
});
afterAll(async () => {
  await closePool();
});
```

## Rules

1. Every test file MUST import from factories — never hardcode test data.
2. `build*` for unit tests (no DB). `create*InDb` for integration tests (async, persisted).
3. Factory functions are ASYNC for PostgreSQL (unlike sync SQLite factories).
4. Use a single pre-computed `TEST_HASH` — no `hashSync` per test.
5. Use TRUNCATE CASCADE between tests — faster than DELETE, resets sequences.

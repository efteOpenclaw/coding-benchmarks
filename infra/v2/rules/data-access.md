# Rules: Data Access Layer (src/lib/db.ts)

## Structure

```ts
// Typed interface for every table
export interface ThingRow { id: string; ... }

// Singleton connection with getDb(':memory:') override for tests
let db: Database.Database | null = null;
export function getDb(path?: string): Database.Database { ... }
export function closeDb(): void { ... }

// Typed query functions
export function createThing(params: CreateParams): ThingRow { ... }
export function getThingById(id: string, userId: string): ThingRow | undefined { ... }
```

## Rules

1. **All SQL lives in this file.** No SQL anywhere else in the codebase.
2. **Always parameterized queries.** Use `?` placeholders. Never string interpolation for values.
3. **Whitelist column names for dynamic queries.** For UPDATE SET and ORDER BY with user-controlled column names, use a `Set` whitelist. Never interpolate user input as column names.
4. **Always scope by userId.** Every query that returns user data must include `AND user_id = ?`.
5. **Return typed interfaces**, never raw `any` or untyped rows.
6. **Use `crypto.randomUUID()`** for IDs. No `uuid` dependency needed.
7. **Use `RETURNING *`** for INSERT/UPDATE operations.
8. **Enable WAL mode and foreign keys** on connection init.
9. **getDb(':memory:')** must work for tests — this is how tests get isolation.

## Before writing db functions

Read `templates/db-query.ts` and match its structure.

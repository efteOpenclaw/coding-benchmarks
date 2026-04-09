---
name: authorization
description: Resource ownership verification — always scope queries by userId, return 404 for other users' resources, pull userId from server session only. Use when writing data access functions or protected API routes.
globs: "**/lib/db.ts,**/app/api/**/route.ts"
---

# Authorization — Ownership Verification

## Data access pattern (copy this)

```typescript
// EVERY query that returns user data must include AND user_id = ?
export function getTaskById(id: string, userId: string): TaskRow | undefined {
  return getDb().prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(id, userId) as TaskRow | undefined;
}

// Route handler — userId ALWAYS from session, NEVER from request body
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session.userId) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

  const { id } = await params;
  const task = getTaskById(id, session.userId);  // scoped by userId
  if (!task) return errorResponse('NOT_FOUND', 'Task not found', 404);  // 404 not 403

  return successResponse({ task });
}
```

## Rules

1. Every data function that returns user data takes `userId` as a parameter.
2. Always pull `userId` from the server-side session. Never trust request body or headers.
3. Return 404 (not 403) when a user accesses another user's resource — prevents enumeration.
4. Never expose sequential/internal IDs without ownership verification.

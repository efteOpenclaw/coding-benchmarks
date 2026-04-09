# Rules: API Route Handlers (src/app/api/)

## Structure

Every route handler follows this exact sequence:

```
try {
  getDb();
  session = await getSessionFromRequest(req);
  if (!session.userId) → errorResponse('UNAUTHORIZED', ..., 401)
  parsed = schema.safeParse(input);
  if (!parsed.success) → errorResponse('VALIDATION_ERROR', ..., 400)
  result = dbFunction(session.userId, parsed.data);
  return successResponse({ result }, statusCode);
} catch {
  return errorResponse('INTERNAL_ERROR', ..., 500);
}
```

## Rules

1. **Always use `successResponse()` / `errorResponse()`** from `@/lib/api-response`. Never construct `NextResponse.json()` directly.
2. **Always use `.safeParse()`**, never `.parse()`. Thrown Zod errors leak internal details.
3. **No SQL in route handlers.** Call typed functions from `@/lib/db`.
4. **No console statements.** Zero `console.log`, `console.error`, `console.warn`.
5. **No business logic.** Routes are glue: auth check → validate → call db → respond.
6. **Return 404 for wrong-user resources**, never 403 (prevents info leaks).
7. **POST returns 201**, GET returns 200, PATCH returns 200, DELETE returns 200.

## Before writing a route

Read `templates/api-route.ts` and match its structure.

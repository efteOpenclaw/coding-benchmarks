---
name: test-error-paths
description: Boundary value testing with it.each, systematic error path coverage per endpoint — missing fields, wrong types, boundary values, invalid enums. Use when writing validation and error handling tests.
globs: "**/*.test.ts,**/validators.test.ts"
---

# Error Path Coverage — Boundary Values + it.each

## Boundary value pattern (copy this)

```typescript
it.each([
  ['', false, 'empty string'],
  ['a', true, 'minimum valid (1 char)'],
  ['a'.repeat(200), true, 'at maximum (200)'],
  ['a'.repeat(201), false, 'exceeds maximum (201)'],
])("title '%s' valid=%s (%s)", (title, shouldBeValid) => {
  const result = createTaskSchema.safeParse({ title });
  expect(result.success).toBe(shouldBeValid);
});
```

## Error path checklist per endpoint

```
□ Missing each required field individually (not all at once)
□ Wrong type for each field (string where number expected)
□ Empty values (empty string, null, undefined)
□ Boundary values (0, -1, max, max+1, very long strings)
□ Invalid enum values ('archived' for status, 'critical' for priority)
□ Invalid date format ('not-a-date' for due_date)
□ Unauthenticated request (no cookie)
□ Wrong user's resource (should get 404, not 403)
□ Non-existent resource ID (valid format, doesn't exist)
□ Duplicate creation (same email → 409)
```

## Validation depth in schemas

```typescript
// Always add max lengths — prevents abuse
email: z.string().trim().toLowerCase().email().max(255)
password: z.string().min(8).max(128)
title: z.string().trim().min(1).max(200)
description: z.string().max(5000).nullable().optional()
due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
```

---
name: zod-validation
description: Zod schema patterns with safeParse, z.infer type exports, input length caps, email normalization, date format regex. Use when creating lib/validators.ts or any Zod schema.
globs: "**/lib/validators.ts,**/validators.ts,**/schemas.ts"
---

# Zod Validation — Schema Patterns

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(5000).nullable().optional().default(null),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').nullable().optional().default(null),
});

// Type exports — single source of truth
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

## Rules

1. One schema per operation (create, update, query, login, register).
2. Always `.safeParse()` in route handlers. Never `.parse()` — it throws.
3. `.trim()` on all string inputs.
4. `.max()` on all strings — email 255, password 128, text fields explicit.
5. `.toLowerCase()` on email — prevents duplicate accounts.
6. `.default()` for optional fields with sensible defaults.
7. Export `z.infer<>` types for each schema.

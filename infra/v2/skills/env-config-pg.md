---
name: env-config-pg
description: Environment variable validation for PostgreSQL projects — DATABASE_URL connection string, SESSION_SECRET, Zod at startup, throw on failure. Use when creating lib/env.ts or .env.example with PostgreSQL.
globs: "**/lib/env.ts,**/env.ts,**/.env.example"
---

# Environment Config — PostgreSQL Projects

## env.ts (copy this)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${
      parsed.error.issues.map(i => `  ${i.path}: ${i.message}`).join('\n')
    }\nSee .env.example for required values.`
  );
}

export const env = parsed.data;
```

## .env.example (always provide)

```bash
# Generate with: openssl rand -base64 32
SESSION_SECRET=generate-a-32-char-secret-here
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/wiki_dev
NODE_ENV=development
```

## Rules

1. Use `throw new Error()` on validation failure. NEVER `console.error` + `process.exit`.
2. Every env var must be in `.env.example` with a comment.
3. Use `DATABASE_URL` (not DATABASE_PATH) for PostgreSQL — connection string format.

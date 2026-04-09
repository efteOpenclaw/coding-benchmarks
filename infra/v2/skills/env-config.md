---
name: env-config
description: Environment variable validation with Zod at startup, .env.example file, throw on failure (no console). Use when creating lib/env.ts, .env.example, or reading process.env.
globs: "**/lib/env.ts,**/env.ts,**/.env.example"
---

# Environment Config — Validate at Startup

## env.ts (copy this)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  DATABASE_PATH: z.string().min(1).default('./data/app.db'),
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
DATABASE_PATH=./data/app.db
NODE_ENV=development
```

## Rules

1. Use `throw new Error()` on validation failure. NEVER `console.error` + `process.exit`.
2. Every env var must be in `.env.example` with a comment.
3. Secrets use `.default()` only for development — never commit real secrets.

---
name: meta-tests
description: Self-enforcing compliance tests — tests that verify the testing infrastructure and code patterns. Create in Chunk 0, run with vitest. Catches factory bypass, any types, console statements, and architectural violations automatically.
globs: "**/tests/meta/**,**/compliance.test.*"
---

# Meta-Tests — Self-Enforcing Guardrails

## Why

Rules get skipped. Grep checks miss edge cases. But models always fix failing tests. Meta-tests turn compliance rules into tests that fail when violated — the strongest enforcement mechanism we have.

## Create this in Chunk 0 (copy and adapt)

```typescript
// tests/meta/compliance.test.ts
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = resolve(__dirname, '../../src');

function findFiles(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
      const full = join(dir, entry.name);
      if (entry.isFile() && ext.some(e => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
  } catch { /* dir doesn't exist yet */ }
  return results;
}

function readSafe(path: string): string {
  try { return readFileSync(path, 'utf-8'); } catch { return ''; }
}

describe('Code compliance', () => {
  it('no any types in source files', () => {
    const violations: string[] = [];
    for (const file of findFiles(SRC, ['.ts', '.tsx'])) {
      if (file.includes('.test.')) continue;
      const content = readSafe(file);
      if (/:\s*any\b|<any>|as any/.test(content)) {
        violations.push(file.replace(SRC, 'src'));
      }
    }
    expect(violations, 'Files with any types').toEqual([]);
  });

  it('no console statements in source files', () => {
    const violations: string[] = [];
    for (const file of findFiles(SRC, ['.ts', '.tsx'])) {
      if (file.includes('.test.')) continue;
      const content = readSafe(file);
      if (/console\.(log|error|warn|debug|info)\(/.test(content)) {
        violations.push(file.replace(SRC, 'src'));
      }
    }
    expect(violations, 'Files with console statements').toEqual([]);
  });

  it('no unsafe .parse() — must use .safeParse()', () => {
    const violations: string[] = [];
    for (const file of findFiles(SRC, ['.ts', '.tsx'])) {
      if (file.includes('.test.')) continue;
      const content = readSafe(file);
      // Match .parse( but not .safeParse( and not marked.parse(
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/\.parse\(/.test(line) && !/safeParse|marked\.parse|JSON\.parse|parseInt|parseFloat|url\.parse/.test(line)) {
          violations.push(`${file.replace(SRC, 'src')}:${i + 1}`);
        }
      });
    }
    expect(violations, 'Files with unsafe .parse()').toEqual([]);
  });
});

describe('Test compliance', () => {
  it('route test files use factories, not direct db imports for data creation', () => {
    const violations: string[] = [];
    for (const file of findFiles(SRC, ['.test.ts', '.test.tsx'])) {
      // Only check route/API test files
      if (!file.includes('/api/')) continue;
      const content = readSafe(file);
      // If it imports createUser/createTask from db.ts, that's a bypass
      if (/import\s*\{[^}]*create(?:User|Task|Page)[^}]*\}\s*from\s*['"]@\/lib\/db/.test(content)) {
        violations.push(file.replace(SRC, 'src'));
      }
    }
    expect(violations, 'Route tests importing data creators from db.ts instead of factories').toEqual([]);
  });

  it('no raw Response.json in route handlers', () => {
    const violations: string[] = [];
    for (const file of findFiles(SRC, ['.ts'])) {
      if (file.includes('.test.')) continue;
      if (!file.includes('/api/')) continue;
      const content = readSafe(file);
      if (/Response\.json\(/.test(content) || /NextResponse\.json\(/.test(content)) {
        violations.push(file.replace(SRC, 'src'));
      }
    }
    expect(violations, 'Route handlers using raw Response.json instead of helpers').toEqual([]);
  });
});
```

## Rules

1. Create `tests/meta/compliance.test.ts` in Chunk 0, before any source code.
2. It runs automatically with `npx vitest run` — no separate step needed.
3. When the model writes code that violates a rule, the meta-test FAILS.
4. The model fixes it like any other failing test — this is the enforcement mechanism.
5. Add new checks as you discover patterns. Each check = one `it()` block.
6. Never skip or delete meta-tests to make them pass. Fix the source code instead.

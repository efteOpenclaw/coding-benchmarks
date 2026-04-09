---
name: error-boundaries
description: Next.js error boundary pattern — root error.tsx and section-level error.tsx files. Use when creating error.tsx files or planning error handling strategy.
globs: "**/error.tsx,**/app/**/error.tsx"
---

# Error Boundaries — Catch and Recover

## Root error boundary (copy this)

```tsx
// app/error.tsx
'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-gray-600">An unexpected error occurred.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

## Section error boundary

```tsx
// app/tasks/error.tsx — catches errors in /tasks without breaking the whole app
'use client';

export default function TasksError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-red-800">Failed to load tasks</p>
      <button onClick={reset} className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white">
        Retry
      </button>
    </div>
  );
}
```

## Rules

1. Always create `app/error.tsx` (root boundary).
2. Create section boundaries (`app/tasks/error.tsx`) for major features.
3. Error boundaries must be `'use client'` (Next.js requirement).
4. Never log errors to console in error boundaries. The framework handles logging.

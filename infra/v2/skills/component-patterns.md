---
name: component-patterns
description: React component patterns — typed props interface, named exports, server vs client split, Tailwind styling, accessible HTML. Use when creating any .tsx component file.
globs: "**/components/**/*.tsx,**/app/**/*.tsx"
---

# Component Patterns

## Client component template

```tsx
'use client';

import { useState, FormEvent } from 'react';

interface TaskFormProps {
  onSubmit: (data: { title: string; description: string }) => void;
  onCancel?: () => void;
}

export function TaskForm({ onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: '' });
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="task-title">Title</label>
      <input id="task-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      <button type="submit">Create</button>
      {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
    </form>
  );
}
```

## Server/client split pattern

```tsx
// app/tasks/page.tsx — Server Component (auth guard)
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { TasksClient } from './TasksClient';

export default async function TasksPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');
  return <TasksClient />;
}
```

## Rules

1. Server Components by default. `'use client'` only for useState, useEffect, event handlers.
2. Explicit Props interface above the component. Never `any`.
3. Named exports. Never `export default` (except pages/layouts/error required by Next.js).
4. `htmlFor` + `id` on every label/input pair.
5. Tailwind only. No inline styles, no CSS modules.

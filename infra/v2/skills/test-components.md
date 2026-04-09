---
name: test-components
description: React component test patterns — render, user interaction, form submission, error/loading/empty states, accessibility. Use when writing component .test.tsx files.
globs: "**/components/**/*.test.tsx"
---

# Testing Components

## Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from './TaskForm';

describe('TaskForm', () => {
  it('renders title field and submit button', () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('calls onSubmit with form data', () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Task' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Task' }));
  });

  it('prevents submission with empty title', () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

## Checklist per component

```
□ Renders expected content with given props
□ User interactions trigger correct callbacks
□ Loading state (button disabled, spinner)
□ Error state (error message displayed)
□ Empty state (when no data)
□ Conditional rendering (cancel button when onCancel provided)
□ Form validation feedback
```

## Rules

1. Query priority: `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (last resort).
2. Every `it()` must have at least one `expect()`.
3. Use `vi.fn()` for callback spies, `expect.objectContaining()` for partial matches.
4. Mock `next/navigation` for components using `useRouter`.

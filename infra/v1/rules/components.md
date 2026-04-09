# Rules: Components (src/components/)

## Structure

```tsx
'use client'; // ONLY if the component needs interactivity (state, effects, event handlers)

import { ... } from 'react';

interface ThingProps {    // Explicit Props interface — never inline, never `any`
  data: Thing;
  onAction: () => void;
}

export function Thing({ data, onAction }: ThingProps) {  // Named export, never default
  // ...
}
```

## Rules

1. **Server Components by default.** Only add `'use client'` when the component genuinely needs useState, useEffect, or event handlers.
2. **Named exports only.** `export function Thing` — never `export default`.
3. **Explicit Props interface.** Defined above the component, not inline. Never use `any`.
4. **Tailwind only.** No inline styles, no CSS modules, no styled-components.
5. **Accessible HTML.** `htmlFor` + `id` on every label/input. Semantic elements (button, form, nav). ARIA attributes where needed.
6. **No console statements.** Zero in production code.
7. **Props down, callbacks up.** Data flows down via props. User actions flow up via callback props. No global state unless absolutely necessary.
8. **Max ~150 lines per component.** Split if larger.

## Before writing a component

Read `templates/component.tsx` and match its structure.

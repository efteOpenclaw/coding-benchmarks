// TEMPLATE: Client Component
// Pattern:
//   - 'use client' directive (only when the component needs interactivity)
//   - Explicit Props interface (never inline, never `any`)
//   - Named export (never default export)
//   - Local state with useState, callback props for data flow up
//   - Tailwind classes only — no inline styles, no CSS modules
//   - htmlFor + id on every label/input pair (a11y)
//   - Semantic HTML (form, button type="submit", label, etc.)

'use client';

import { useState, FormEvent } from 'react';

interface ThingFormData {
  title: string;
  description: string;
}

interface ThingFormProps {
  onSubmit: (data: ThingFormData) => void;
  onCancel?: () => void;
}

export function ThingForm({ onSubmit, onCancel }: ThingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
    });

    setTitle('');
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <label htmlFor="thing-title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input
            id="thing-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

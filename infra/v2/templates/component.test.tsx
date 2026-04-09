// TEMPLATE: Component Test
// Pattern:
//   - vi.fn() for callback spies
//   - @testing-library/react with screen queries
//   - Query priority: getByRole > getByLabelText > getByText > getByTestId (last resort)
//   - Assert behavior, not implementation (no snapshot-everything)
//   - Test categories: renders, user interaction, edge cases, a11y

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThingForm } from './ThingForm';

describe('ThingForm', () => {
  it('renders the form with required fields', () => {
    render(<ThingForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('prevents submission with empty title', () => {
    const onSubmit = vi.fn();
    render(<ThingForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed form data', () => {
    const onSubmit = vi.fn();
    render(<ThingForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '  New Thing  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Thing' })
    );
  });

  it('renders cancel button when onCancel provided', () => {
    render(<ThingForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not render cancel button when onCancel omitted', () => {
    render(<ThingForm onSubmit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });
});

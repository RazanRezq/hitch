// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

/**
 * Infrastructure smoke test: proves the React Testing Library + jsdom +
 * jest-dom stack is wired up so component tests can be added later. Renders a
 * trivial self-contained component (with an Icelandic glyph) — no app providers.
 */
function Greeting({ name }: { name: string }) {
  return <p>Halló, {name}</p>;
}

describe('RTL + jsdom infrastructure', () => {
  it('renders a component and queries the DOM', () => {
    render(<Greeting name="Ísland" />);
    expect(screen.getByText('Halló, Ísland')).toBeInTheDocument();
  });
});

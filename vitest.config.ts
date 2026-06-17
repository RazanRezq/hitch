import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Mirror the tsconfig "@/*" path alias so tests resolve the same modules as the app.
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  // Tests transpile TSX via esbuild; use the automatic JSX runtime (matches tsconfig).
  esbuild: { jsx: 'automatic' },
  test: {
    // Node by default — the money-path/logic tests need no DOM. Component tests opt
    // into jsdom per-file with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

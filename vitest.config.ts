import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/core/tests/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});

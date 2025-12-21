import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    },
    // Use separate database for tests
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/boardsesh_daemon_test',
    },
  },
});

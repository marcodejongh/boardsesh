import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Exclude parity tests from CI - run locally with: npm test -- --config vitest.parity.config.ts
    exclude: ['**/node_modules/**', '**/dist/**', '**/*parity*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    },
    // Use separate database for tests (port 5433 to avoid conflicts with main db)
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/boardsesh_backend_test',
    },
  },
});

import { defineConfig } from 'vitest/config';

// Configuration for REST vs GraphQL parity tests
// Uses the development database to compare with public API
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*parity*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Use development database for parity tests (same as public API)
    env: {
      DATABASE_URL: 'postgres://postgres:password@localhost:5432/main',
    },
  },
});

import { defineConfig } from 'vitest/config';

/**
 * Integration test config — Phase 34. Separate from unit tests: single-threaded
 * (one container stack), generous timeouts for image pull + migrations + boot.
 */
export default defineConfig({
  test: {
    include: ['test/integration/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/._*'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 300_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
});

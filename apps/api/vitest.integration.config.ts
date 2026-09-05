import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Integration test config — Phase 34. Separate from unit tests: single-threaded
 * (one container stack), generous timeouts for image pull + migrations + boot.
 * SWC emits decorator metadata so Nest can resolve class-token DI (same as unit).
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
    // Keep `harness.shared` + the PG/Meili stack. Default isolate resets
    // module state between files, so stop()-as-no-op leaked containers and
    // the next file's Meili /health wait timed out.
    isolate: false,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});

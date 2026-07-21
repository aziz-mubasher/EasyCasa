import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Unit + auth e2e tests. SWC emits decorator metadata so Nest can inject
 * Reflector into guards (esbuild drops it). Integration suite uses its own config.
 */
export default defineConfig({
  test: {
    hookTimeout: 60_000,
    include: [
      'src/**/*.spec.ts',
      'test/pilot/**/*.spec.ts',
      'test/metrics.spec.ts',
      'test/readiness.spec.ts',
      'test/exception-filter.spec.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/._*', '**/test/integration/**', '**/*.int.spec.ts'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});

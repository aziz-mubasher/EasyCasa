import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Unit + auth e2e tests. SWC emits decorator metadata so Nest can inject
 * Reflector into guards (esbuild drops it). Integration suite uses its own config.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/._*', '**/test/integration/**'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});

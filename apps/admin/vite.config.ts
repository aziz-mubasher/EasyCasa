import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Shared ships as CJS; Vite/Rollup needs the TS source for named ESM imports.
    alias: {
      '@easycasa/shared': path.resolve(root, '../../packages/shared/src/index.ts'),
    },
  },
  server: { port: 5174 },
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

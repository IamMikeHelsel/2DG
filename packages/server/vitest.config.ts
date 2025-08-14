import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@toodee/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    testTimeout: 30000, // Increase timeout for E2E tests
    hookTimeout: 10000  // Increase timeout for setup/teardown
  }
});


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
    include: ['tests/**/*.spec.ts']
  }
});


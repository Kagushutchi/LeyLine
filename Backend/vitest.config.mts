import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    pool: 'vmThreads',
    maxWorkers: 1,
    fileParallelism: false,
  },
});

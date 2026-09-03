import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run test files sequentially to avoid shared file system conflicts
    // (e.g., Deleted/ directory used by delete, restore, and trash tests)
    fileParallelism: false,
  },
});

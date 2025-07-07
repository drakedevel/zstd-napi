import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: { include: ['binding.js', 'lib/**/*.{js,ts}'] },
    include: ['**/tests/**/*.ts'],
  },
});

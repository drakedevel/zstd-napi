import { createDefaultEsmPreset } from 'ts-jest';
export default {
  ...createDefaultEsmPreset(),
  collectCoverageFrom: ['binding.cjs', 'lib/**/*.{js,ts}'],
  testMatch: ['**/tests/**/*.ts'],
};

import { createDefaultEsmPreset } from 'ts-jest';
export default {
  ...createDefaultEsmPreset(),
  collectCoverageFrom: ['binding.cjs', 'lib/**/*.{js,ts}'],
  // TODO: Remove after upgrading to Jest 30
  prettierPath: null,
  testMatch: ['**/tests/**/*.ts'],
};

import { createDefaultEsmPreset } from 'ts-jest';
export default {
  ...createDefaultEsmPreset(),
  collectCoverageFrom: ['binding.js', 'lib/**/*.{js,ts}'],
  testMatch: ['**/tests/**/*.ts'],
};

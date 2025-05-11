const { createDefaultPreset } = require('ts-jest');
module.exports = {
  ...createDefaultPreset(),
  collectCoverageFrom: ['binding.js', 'lib/**/*.{js,ts}'],
  // TODO: Remove after upgrading to Jest 30
  prettierPath: null,
  testMatch: ['**/tests/**/*.ts'],
};

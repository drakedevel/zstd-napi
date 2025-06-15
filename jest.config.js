const { createDefaultPreset } = require('ts-jest');
module.exports = {
  ...createDefaultPreset(),
  collectCoverageFrom: ['binding.js', 'lib/**/*.{js,ts}'],
  testMatch: ['**/tests/**/*.ts'],
};

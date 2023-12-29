module.exports = {
  preset: 'ts-jest',
  collectCoverageFrom: ['binding.js', 'lib/**/*.{js,ts}'],
  // TODO: Remove after upgrading to Jest 30
  prettierPath: null,
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.ts'],
};

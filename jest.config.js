module.exports = {
  preset: 'ts-jest',
  collectCoverageFrom: ['binding.js', 'lib/**/*.{js,ts}'],
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.ts'],
};

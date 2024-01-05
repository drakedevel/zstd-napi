module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // Suppress warnings abut esModuleInterop, which is disabled per semver-ts
        diagnostics: { ignoreCodes: ['TS151001'] },
      },
    ],
  },
  collectCoverageFrom: ['binding.js', 'lib/**/*.{js,ts}'],
  // TODO: Remove after upgrading to Jest 30
  prettierPath: null,
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.ts'],
};

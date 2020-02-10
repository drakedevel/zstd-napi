module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
  },
  extends: ['eslint:recommended', 'prettier'],
  env: {
    es2017: true,
    node: true,
  },
  overrides: [
    {
      files: './**/*.ts',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
    },
    {
      files: './tests/**/*.{js,ts}',
      plugins: ['jest'],
      extends: ['plugin:jest/recommended', 'plugin:jest/style'],
      rules: {
        'jest/expect-expect': [
          'warn',
          {
            assertFunctionNames: ['expect*'],
          },
        ],
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/'],
};

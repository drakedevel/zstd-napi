module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
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
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/unbound-method': 'off',
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

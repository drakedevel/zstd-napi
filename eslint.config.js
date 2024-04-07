const eslint = require('@eslint/js');
const eslintConfigPrettier = require('eslint-config-prettier');
// @ts-expect-error: no types available
const jest = require('eslint-plugin-jest');
const tsdoc = require('eslint-plugin-tsdoc');
const globals = require('globals');
const tseslint = require('typescript-eslint');
module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ['**/*.ts'],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((c) => ({
    ...c,
    files: ['**/*.ts'],
  })),
  eslintConfigPrettier,
  {
    ignores: ['coverage/', 'docs/', 'dist/', 'node_modules/'],
  },
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'commonjs',
      globals: globals.node,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['tests/**/*.{js,ts}'],
    ...jest.configs['flat/recommended'],
    ...jest.configs['flat/style'],
  },
  {
    files: ['**/*.ts'],
    // @ts-expect-error: plugin type incompatible with exactOptionalPropertyTypes
    plugins: { tsdoc },
    rules: {
      'tsdoc/syntax': 'error',
    },
  },
  {
    files: ['tests/**/*.{js,ts}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
        },
      ],
      '@typescript-eslint/dot-notation': 'off',
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
);

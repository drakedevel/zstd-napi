const eslint = require('@eslint/js');
const eslintConfigPrettier = require('eslint-config-prettier');
const jest = require('eslint-plugin-jest');
const tsdoc = require('eslint-plugin-tsdoc');
const globals = require('globals');
const tseslint = require('typescript-eslint');
module.exports = tseslint.config(
  eslint.configs.recommended,
  {
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.ts'],
  },
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
    extends: [jest.configs['flat/style'], jest.configs['flat/recommended']],
    files: ['tests/**/*.{js,ts}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'jest/expect-expect': ['warn', { assertFunctionNames: ['expect*'] }],
    },
  },
  {
    files: ['**/*.ts'],
    plugins: { tsdoc },
    rules: {
      'tsdoc/syntax': 'error',
    },
  },
);

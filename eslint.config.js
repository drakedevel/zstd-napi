const eslint = require('@eslint/js');
const eslintConfigPrettier = require('eslint-config-prettier/flat');
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
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_' },
      ],
    },
  },
  eslintConfigPrettier,
  {
    ignores: ['coverage/', 'docs/', 'dist/', 'node_modules/'],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
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
      '@typescript-eslint/dot-notation': 'off',
      'jest/expect-expect': ['warn', { assertFunctionNames: ['expect*'] }],
      'jest/no-done-callback': 'off',
      'jest/no-standalone-expect': [
        'error',
        { additionalTestBlockFunctions: ['afterEach', 'it.prop'] },
      ],
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

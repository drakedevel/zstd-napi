import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import jest from 'eslint-plugin-jest';
import tsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  eslint.configs.recommended,
  {
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.{cts,ts}'],
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
      globals: globals.node,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    extends: [jest.configs['flat/style'], jest.configs['flat/recommended']],
    files: ['tests/**/*.{cjs,cts,js,ts}'],
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
    files: ['**/*.{cts,ts}'],
    plugins: { tsdoc },
    rules: {
      'tsdoc/syntax': 'error',
    },
  },
);

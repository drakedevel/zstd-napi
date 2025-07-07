import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
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
    extends: [vitest.configs.recommended],
    files: ['tests/**/*.{cjs,cts,js,ts}'],
    rules: {
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect*'] }],
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

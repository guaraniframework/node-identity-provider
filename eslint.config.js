import { defineConfig } from 'eslint/config';
import importX from 'eslint-plugin-import-x';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard';
import tseslint from 'typescript-eslint';

import js from '@eslint/js';

export default defineConfig([
  ...neostandard({
    ignores: [...resolveIgnoresFromGitignore(), 'eslint.config.js'],
    semi: true,
    noStyle: true,
    noJsx: true,
    ts: true,
  }),
  {
    files: ['**/*.js', '**/*.ts'],
    plugins: {
      js,
      prettier,
      'import-x': importX,
      'simple-import-sort': simpleImportSort,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        NodeJS: true,
        Properties: 'readonly',
      },
    },
    extends: ['js/recommended'],
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [['^\\u0000'], ['^\\w'], ['^@\\w'], ['^\\.\\.(?!/?$)', '^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)']],
        },
      ],
      'simple-import-sort/exports': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      'prettier/prettier': 'error',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  {
    files: ['**/*.spec.ts'],
    ...jest.configs['flat/recommended'],
    plugins: { jest },
    languageOptions: {
      globals: { ...globals.jest, ...jest.environments.globals.globals },
    },
  },
]);

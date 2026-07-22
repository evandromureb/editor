import js from '@eslint/js'
import globals from 'globals'
import jsdoc from 'eslint-plugin-jsdoc'

export default [
  {
    ignores: ['dist/**', 'src/generated/**', '.build/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: { jsdoc },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-unused-private-class-members': 'off',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/valid-types': 'warn',
      'jsdoc/no-undefined-types': 'off',
    },
  },
  {
    files: ['page/**/*.js'],
    languageOptions: {
      globals: {
        EditorBundle: 'readonly',
      },
    },
  },
]

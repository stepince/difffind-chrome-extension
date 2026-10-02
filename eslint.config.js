export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-unused-vars': 'error',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-eval': 'error',
    },
  },
];

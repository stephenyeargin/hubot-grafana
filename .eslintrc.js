module.exports = {
  env: {
    node: true,
    es2021: true,
    mocha: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Loose equality bugs are worth catching; `== null` stays allowed as the
    // idiomatic null-or-undefined check.
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    // getUidBySlug's paginated search loop relies on an internal `break`.
    'no-constant-condition': ['error', { checkLoops: false }],
  },
  overrides: [
    {
      // TestBotContext is imported purely for `@type {TestBotContext}` JSDoc annotations.
      files: ['test/**/*.js'],
      rules: {
        'no-unused-vars': ['error', { varsIgnorePattern: '^TestBotContext$' }],
      },
    },
    {
      // Responder/Uploader/TypingIndicator are override-point base classes;
      // their default no-op methods intentionally ignore their arguments.
      files: ['src/adapters/Responder.js', 'src/adapters/Uploader.js', 'src/adapters/TypingIndicator.js'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
  ],
};

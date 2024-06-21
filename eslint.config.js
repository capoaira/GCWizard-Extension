// eslint.config.js
module.exports = {
  files: ['**/*.js'],
  rules: {
    // ignore unused variables starting with _
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};

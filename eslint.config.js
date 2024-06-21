// eslint.config.js
module.exports = {
  extends: ['eslint:recommended', 'prettier'],
  files: ['src/**/*.js'],
  rules: {
    // ignore unused variables starting with _
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // neccesary for lint on Windows
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
  },
};

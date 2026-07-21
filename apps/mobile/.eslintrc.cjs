/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['.expo/', 'dist/', 'node_modules/', 'web-build/'],
};

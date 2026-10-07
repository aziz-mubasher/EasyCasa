/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['.expo/', 'dist/', 'node_modules/', 'web-build/'],
  rules: {
    // eslint-config-expo 8 (SDK 52) turns on React Compiler checks.
    // Existing screens keep their current behavior; this PR does not restyle them.
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/refs': 'off',
  },
};

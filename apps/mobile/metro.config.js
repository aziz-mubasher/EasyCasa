// Monorepo-aware Metro config so the Expo app can resolve workspace packages
// (@easycasa/api-client, @easycasa/design-tokens) hoisted by pnpm.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so edits to shared packages hot-reload.
config.watchFolders = [monorepoRoot];

// Resolve modules from the app first, then the monorepo root.
// pnpm does not hoist transitive packages into those folders; the virtual
// store at node_modules/.pnpm/node_modules is where they actually live.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules/.pnpm/node_modules'),
];

// pnpm uses symlinks. Keep lookup inside nodeModulesPaths so a nested
// package does not pull a second copy of react-native past the web alias.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

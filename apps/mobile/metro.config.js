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
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks; let Metro follow them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

// Monorepo-aware Metro config so the Expo app can resolve workspace packages
// (@easycasa/api-client, @easycasa/design-tokens) hoisted by pnpm.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Keep Expo's default watch folders and add the monorepo root so workspace
// packages (@easycasa/api-client, @easycasa/design-tokens) hot-reload.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), monorepoRoot])];

// Resolve modules from the app first, then the monorepo root (pnpm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;

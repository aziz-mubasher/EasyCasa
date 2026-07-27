// Monorepo + pnpm: Metro must follow symlinks to nested peers (expo-router, react-native-web).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const MetroSymlinksResolver = require('@rnx-kit/metro-resolver-symlinks');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const symlinkResolve = MetroSymlinksResolver();

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'src/stubs/react-native-maps.web.tsx'),
    };
  }
  return symlinkResolve(context, moduleName, platform);
};

module.exports = config;

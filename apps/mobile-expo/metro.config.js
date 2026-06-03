const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Resolver paquetes anidados de react-native en monorepo npm workspaces
config.resolver.extraNodeModules = {
  '@react-native/virtualized-lists': path.resolve(
    monorepoRoot,
    'node_modules/react-native/node_modules/@react-native/virtualized-lists'
  ),
};

module.exports = config;

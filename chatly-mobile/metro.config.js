// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

// Allow Metro to transform ESM packages using import.meta in node_modules
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Ensure node_modules with import.meta are transformed (not excluded)
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
};

module.exports = withNativeWind(config, { input: './global.css' });

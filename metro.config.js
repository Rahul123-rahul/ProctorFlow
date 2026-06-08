// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend (wa-sqlite) imports a `.wasm` binary. Metro does not
// treat `.wasm` as a resolvable asset by default, so register it. This only
// affects web bundling; the native (Android/iOS) SQLite path never loads it.
config.resolver.assetExts.push('wasm');

module.exports = config;
// Default Expo Metro config. Expo resolves the `@/*` tsconfig path alias
// automatically; this file is kept explicit so customisations are easy to add.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;

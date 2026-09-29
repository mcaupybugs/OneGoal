const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Keep Metro focused on this app, but preserve Expo's default module resolution.
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

module.exports = config;

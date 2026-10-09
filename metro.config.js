const { getDefaultConfig } = require("expo/metro-config");
const { withAngularNative } = require("@ng-native/metro/config.cjs");
const { withTailwind } = require("@ng-native/tailwind/config.cjs");

module.exports = withTailwind(withAngularNative(getDefaultConfig(__dirname)), {
  input: "./src/styles.css",
});

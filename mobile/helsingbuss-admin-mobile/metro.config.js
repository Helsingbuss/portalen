
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

const emptyModule = require.resolve("./src/shims/emptyModule.js");

const blocked = [
  "@opentelemetry",
  "opentelemetry",
  "require-in-the-middle",
  "import-in-the-middle",
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (blocked.some((name) => moduleName === name || moduleName.startsWith(name + "/") || moduleName.includes(name))) {
    return {
      type: "sourceFile",
      filePath: emptyModule,
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

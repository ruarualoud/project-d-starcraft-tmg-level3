const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

// Keep one repository-owned Client Domain Module and its presentation media;
// never vendor client copies. Watching the whole Level-3 workspace makes
// Metro's node crawler enumerate large rule/probe artifacts that cannot be
// imported by this App and can overflow its file-map transport.
const sharedPackages = path.resolve(workspaceRoot, "packages");
const sharedAssets = path.resolve(workspaceRoot, "assets");
const sharedExecutableContent = path.resolve(workspaceRoot, "content");
config.watchFolders = [...new Set([
  ...(config.watchFolders ?? []).filter(
    (folder) => path.resolve(folder) !== workspaceRoot,
  ),
  sharedPackages,
  sharedAssets,
  sharedExecutableContent,
])];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
];

const staticWebCssInput = process.env.PROJECT_D_STATIC_WEB_CSS_INPUT;
if (staticWebCssInput) {
  const sourceCss = path.resolve(__dirname, "global.css");
  const compiledCss = path.resolve(staticWebCssInput);
  if (!compiledCss.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error("PROJECT_D_STATIC_WEB_CSS_OUTSIDE_WORKSPACE");
  }
  const originalResolver = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolver = originalResolver ?? context.resolveRequest;
    const resolved = resolver(context, moduleName, platform);
    return "filePath" in resolved && path.resolve(resolved.filePath) === sourceCss
      ? { ...resolved, filePath: compiledCss }
      : resolved;
  };
  module.exports = config;
} else {
  module.exports = withNativeWind(config, {
    input: "./global.css",
    // Native development and device builds retain filesystem-backed styles.
    forceWriteFileSystem: true,
  });
}

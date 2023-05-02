const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const nodeModulesDir = path.resolve(__dirname, './node_modules')
const commonDir = path.resolve(__dirname, '../common')

const extraNodeModules = {
  'common': commonDir,
};

const watchFolders = [
  commonDir
];

defaultConfig.transformer.getTransformOptions = () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  }
})

defaultConfig.resolver.nodeModulesPaths = [nodeModulesDir]

defaultConfig.resolver.extraNodeModules = new Proxy(extraNodeModules, {
  get: (target, name) => {
    const correctPath = name in target ? target[name] : path.join(process.cwd(), `node_modules/${name}`);

    if (!name in target) {
      console.log(path.join(process.cwd(), `node_modules/${name}`))
    }

    //redirects dependencies referenced from common/ to local node_modules
    return correctPath
  }
})

defaultConfig.watchFolders = watchFolders;

// Workaround for react-native library bug:
// https://github.com/facebook/react-native/issues/36794
defaultConfig.server = {
    rewriteRequestUrl: (url) => {
        if (!url.endsWith('.bundle')) {
            return url;
        }
        // https://github.com/facebook/react-native/issues/36794
        // JavaScriptCore strips query strings, so try to re-add them with a best guess.
        return url + '?platform=ios&dev=true&minify=false&modulesOnly=false&runModule=true';
    }, // ...
}, // ...

module.exports = defaultConfig;
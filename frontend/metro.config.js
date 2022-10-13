const path = require('path');

const nodeModulesDir = path.resolve(__dirname, '../node_modules')
const commonDir = path.resolve(__dirname, '../common')

console.log('nodeModulesDir', nodeModulesDir)
console.log('commonDir', commonDir)

const extraNodeModules = {
  'common': commonDir,
};

const watchFolders = [
  commonDir
];


module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  }, 
  resolver: {
    extraNodeModules: new Proxy(extraNodeModules, {
      get: (target, name) => {
        const correctPath = name in target ? target[name] : path.join(process.cwd(), `node_modules/${name}`);

        if (!name in target) {
          console.log(path.join(process.cwd(), `node_modules/${name}`))
        }

        //redirects dependencies referenced from common/ to local node_modules
        return correctPath
      }
    }),
    nodeModulesPaths: [nodeModulesDir]
  },
  watchFolders,
};
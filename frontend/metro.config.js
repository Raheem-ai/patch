const path = require('path');

const extraNodeModules = {
  'common': path.resolve(__dirname, '../common'),
};

const watchFolders = [
  path.resolve(__dirname, '../common')
];

const aliases = {
  'crypto': 'crypto-browserify'
}

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

        if (name.includes('crypto')) {
          console.log(name, correctPath)
          return correctPath.replace('crypto', 'crypto-browserify')
        }

        //redirects dependencies referenced from common/ to local node_modules
        return correctPath
      }
    }),
  },
  watchFolders,
};
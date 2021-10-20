module.exports = function(api) {
  api.cache(true);

  const presets = ['babel-preset-expo'];

  const env = {
    production: {
      plugins: ['react-native-paper/babel'],
    },
  }

  const plugins = [
    [
      require('babel-plugin-module-resolver'),
      {
        alias: {
          "crypto": "crypto-browserify"
        }
      }
  
    ]
  ];

  return {
    presets,
    env,
    plugins
  };
};

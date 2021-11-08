module.exports = function(api) {
  api.cache(true);

  const presets = ['babel-preset-expo'];

  const env = {
    production: {
      plugins: ['react-native-paper/babel'],
    },
  }

  const plugins = [
  ];

  return {
    presets,
    env,
    plugins
  };
};

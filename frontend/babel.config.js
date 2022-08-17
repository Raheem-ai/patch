module.exports = function(api) {
  api.cache(true);

  const presets = ['babel-preset-expo'];

  const env = {
    production: {
      plugins: ['react-native-paper/babel'],
    },
  }

  const plugins = [
    "react-native-reanimated/plugin" // NOTE: need to be the last item in this array !!!
  ];

  return {
    presets,
    env,
    plugins
  };
};

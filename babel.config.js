module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  // React Compiler must be FIRST to analyze raw source code correctly
  plugins.push('babel-plugin-react-compiler');

  plugins.push('react-native-worklets/plugin');

  return {
    presets: ['babel-preset-expo'],

    plugins,
  };
};

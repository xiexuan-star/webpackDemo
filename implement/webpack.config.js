const path = require('path');
const PluginA = require('./plugins/plugin-a');
const PluginB = require('./plugins/plugin-b');
const DefinePlugin = require('./plugins/definePlugin');

// 引入loader和plugin
module.exports = {
  mode: 'development',
  entry: {
    main: path.resolve(__dirname, './src/entry1.js'),
    second: path.resolve(__dirname, './src/entry2.js'),
  },
  devtool: false,
  // 基础目录，绝对路径，用于从配置中解析入口点(entry point)和 加载器(loader)
  // 换而言之entry和loader的所有相对路径都是相对于这个路径而言的
  context: process.cwd(),
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  plugins: [new PluginB(), new PluginA(), new DefinePlugin({ __WEB_ENV__: 'env!' })],
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: [
          path.resolve(__dirname, './loaders/loader-a.js'),
          path.resolve(__dirname, './loaders/loader-b.js'),
        ],
      },
    ],
  },
};

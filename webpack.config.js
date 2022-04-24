const path = require('path');
const CompressAssetsPlugin = require('./plugins/CompressAssetsPlugin');
const ExternalWebpackPlugin = require('./plugins/ExternalWebpackPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'development',
  entry: {
    main: path.resolve(__dirname, './src/main.js')
  },
  devtool: false,
  externals: { lodash: '_' },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new CompressAssetsPlugin({
      output: 'bundler.zip'
    }),
    new ExternalWebpackPlugin({
      'lodash': {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
        variableName: '_'
      }
    })
  ],
};

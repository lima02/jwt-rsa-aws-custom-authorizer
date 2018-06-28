const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    library: 'main',
    libraryTarget: 'commonjs2'
  },
  target: "node", // in order to ignore built-in modules like path, fs, etc.
  externals: ['aws-sdk', 'lambda-local']
};
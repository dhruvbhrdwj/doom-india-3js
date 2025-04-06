const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname),
    },
    hot: true,
    allowedHosts: 'all',
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Indian FPS Game',
      template: './index.html',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(obj|mtl|gltf|glb)$/i,
        type: 'asset/resource',
      },
    ],
  },
};

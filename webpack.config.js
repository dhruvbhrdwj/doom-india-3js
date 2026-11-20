import { fileURLToPath } from 'node:url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

export default {
  mode: 'development',
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: fileURLToPath(new URL('./dist', import.meta.url)),
    clean: true,
  },
  devServer: {
    host: '127.0.0.1',
    static: false,
  },
  plugins: [new HtmlWebpackPlugin({ template: './index.html' })],
};

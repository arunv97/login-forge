const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path'); 
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
  },
  resolve: {
    plugins: [
      new TsconfigPathsPlugin({
        configFile: resolve(__dirname, 'tsconfig.app.json'),
      }),
    ],
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
};

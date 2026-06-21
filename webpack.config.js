const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = () => {
  return {
    entry: {
      background: `./src/background/index.ts`,
      content: `./src/content/index.ts`,
      popup: `./src/ui/popup/popup.ts`,
      management: `./src/ui/management/management.ts`,
      inject: `./src/content/inject.ts`,
    },
    output: {
      path: path.resolve(__dirname, `dist/`),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/icons/logo.svg', to: 'icons/logo.svg' },
          { from: 'src/icons/logo-16.png', to: 'icons/logo-16.png' },
          { from: 'src/icons/logo-32.png', to: 'icons/logo-32.png' },
          { from: 'src/icons/logo-48.png', to: 'icons/logo-48.png' },
          { from: 'src/icons/logo-64.png', to: 'icons/logo-64.png' },
          { from: 'src/icons/logo-128.png', to: 'icons/logo-128.png' }
        ],
      }),
    ],
    mode: 'production',
  };
};

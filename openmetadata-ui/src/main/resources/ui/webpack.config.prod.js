/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const process = require('process');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const outputPath = path.join(__dirname, 'dist/assets');
const subPath = process.env.APP_SUB_PATH ?? '';

module.exports = {
  // Production mode
  mode: 'production',

  // Input configuration
  entry: path.join(__dirname, 'src/index.tsx'),

  // Output configuration
  output: {
    path: outputPath,
    filename: 'openmetadata.[fullhash].js',
    chunkFilename: '[name].[fullhash].js',
    // Clean the output directory before emit.
    clean: true,
    // Ensures bundle is served from absolute path as opposed to relative
    publicPath: `${subPath ?? ''}/`,
  },

  // Loaders
  module: {
    rules: [
      // .mjs files to be handled
      {
        test: /\.m?js/,
        include: path.resolve(__dirname, 'node_modules/kleur'),
        resolve: {
          fullySpecified: false,
        },
      },

      // .ts and .tsx files to be handled by ts-loader
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json',
          transpileOnly: true, // Speed up compilation in development mode
        },
        include: path.resolve(__dirname, 'src'), // Just the source code
      },
      // .css files to be handled by style-loader & css-loader
      {
        test: /\.(css)$/,
        use: ['style-loader', 'css-loader'],
      },
      // .less files to be handled by less-loader
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      // .svg files to be handled by @svgr/webpack
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader'],
        include: path.resolve(__dirname, 'src'), // Just the source code
      },
      // images files to be handled by file-loader
      {
        test: /\.png$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'images/',
            },
          },
        ],
      },
    ],
  },

  // Module resolution
  resolve: {
    // File types to be handled
    extensions: ['.ts', '.tsx', '.js', '.css', '.less', '.svg'],
    fallback: {
      https: require.resolve('https-browserify'),
      fs: false,
      'process/browser': require.resolve('process/browser'),
    },
    alias: {
      process: 'process/browser',
      Quill: path.resolve(__dirname, 'node_modules/quill'),  // Alias for the 'quill' library in node_modules
    },
  },

  plugins: [
    // Clean webpack output directory
    new CleanWebpackPlugin({
      verbose: true,
    }),
    // Generate index.html from template
    new HtmlWebpackPlugin({
      favicon: path.join(__dirname, 'public/favicon.png'),
      hash: true,
      cache: false,
      template: path.join(__dirname, 'public/index.html'),
      scriptLoading: 'defer',
    }),
    // Copy favicon, logo and manifest for index.html
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, 'public/favicon.png'),
          to: outputPath,
        },
        {
          from: path.join(__dirname, 'public/favicons/favicon-16x16.png'),
          to: outputPath,
        },
        {
          from: path.join(__dirname, 'public/favicons/favicon-32x32.png'),
          to: outputPath,
        },
        {
          from: path.join(__dirname, 'public/logo192.png'),
          to: outputPath,
        },
        {
          from: path.join(__dirname, 'public/manifest.json'),
          to: outputPath,
        },
        {
          from: path.join(__dirname, 'public/swagger.html'),
          to: outputPath,
        },
        {
          from: path.join(__dirname, 'public/locales'),
          to: outputPath,
        },
      ],
    }),
  ],
};

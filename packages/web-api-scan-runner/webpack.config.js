// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const path = require('path');
const webpack = require('webpack');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
    const version = env ? env.version : 'dev';
    console.log(`Building for version : ${version}`);

    return {
        devtool: 'cheap-source-map',
        externals: ['puppeteer', 'yargs', 'axe-core', 'axe-puppeteer', 'applicationinsights'],
        entry: {
            ['web-api-scan-runner']: path.resolve('./src/index.ts'),
        },
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: true,
                                experimentalWatchApi: true,
                            },
                        },
                    ],
                    exclude: ['/node_modules/', /\.(spec|e2e)\.ts$/],
                },
            ],
        },
        name: 'web-api-scan-runner',
        node: {
            __dirname: false,
        },
        output: {
            path: path.resolve('./dist'),
            filename: '[name].js',
            libraryTarget: 'commonjs2',
        },
        plugins: [
            new webpack.DefinePlugin({
                __IMAGE_VERSION__: JSON.stringify(version),
            }),
            new ForkTsCheckerWebpackPlugin(),
            new copyWebpackPlugin([
                {
                    context: './docker-image-config',
                    from: 'package.json',
                    to: '',
                    ignore: ['dist/**', 'node_modules/**'],
                },
                {
                    context: './docker-image-config',
                    from: '.dockerignore',
                    to: '',
                    ignore: ['dist/**', 'node_modules/**'],
                },
                {
                    context: './docker-image-config',
                    from: 'Dockerfile',
                    to: '',
                    ignore: ['dist/**', 'node_modules/**'],
                },
            ]),
        ],
        resolve: {
            extensions: ['.ts', '.js', '.json'],
            mainFields: ['main'],
        },
        target: 'node',
    };
};

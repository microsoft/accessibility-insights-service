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
        externals: ['@azure/functions'],
        entry: {
            ['post-scans-func']: path.resolve('./post-scans-func/index.ts'),
            ['get-scan-func']: path.resolve('./get-scan-func/index.ts'),
            ['get-scans-batch-func']: path.resolve('./get-scans-batch-func/index.ts'),
            ['get-report-func']: path.resolve('./get-report-func/index.ts'),
            ['check-health-func']: path.resolve('./check-health-func/index.ts'),
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
        name: 'web-api',
        node: {
            __dirname: false,
        },
        output: {
            path: path.resolve('./dist'),
            filename: '[name]/index.js',
            libraryTarget: 'commonjs2',
        },
        plugins: [
            new webpack.DefinePlugin({
                __IMAGE_VERSION__: JSON.stringify(version),
            }),
            new ForkTsCheckerWebpackPlugin(),
            new copyWebpackPlugin([
                {
                    context: './',
                    from: '**/function.json',
                    to: '',
                    ignore: ['dist/**'],
                },
                {
                    context: './',
                    from: 'host.json',
                    to: '',
                    ignore: ['dist/**'],
                },
                {
                    from: 'package.json',
                    to: '',
                },
                {
                    from: '../../yarn.lock',
                    to: '',
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

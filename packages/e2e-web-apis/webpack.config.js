// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const webpack = require('webpack');
const forkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');
const ignoreDynamicRequire = require('webpack-ignore-dynamic-require');

module.exports = (env) => {
    const version = env?.version ?? 'dev';
    console.log(`Building for version : ${version}`);

    return {
        devtool: 'cheap-source-map',
        externals: ['@azure/functions'],
        entry: {
            ['scan-notification-client-func']: path.resolve('./scan-notification-client-func/index.ts'),
            ['scan-notification-client-func-fail']: path.resolve('./scan-notification-client-func-fail/index.ts'),
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
                {
                    test: /\.node$/,
                    use: [
                        {
                            loader: 'node-loader',
                        },
                    ],
                },
            ],
        },
        name: 'e2e-web-apis',
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
            new forkTsCheckerWebpackPlugin(),
            new ignoreDynamicRequire(),
            new copyWebpackPlugin({
                patterns: [
                    {
                        context: './',
                        from: 'host.json',
                        to: '',
                        globOptions: { ignore: ['dist/**'] },
                    },
                    {
                        from: 'package-func.json',
                        to: 'package.json',
                    },
                ],
            }),
        ],
        resolve: {
            extensions: ['.ts', '.js', '.json'],
            mainFields: ['main'],
        },
        target: 'node',
    };
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');

function getCommonConfig(version, generateTypings) {
    return {
        devtool: 'cheap-source-map',
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'awesome-typescript-loader',
                            options: {
                                transpileOnly: generateTypings ? false : true, // transpileOnly=false generates typings
                                experimentalWatchApi: true,
                            },
                        },
                    ],
                    exclude: ['/node_modules/', /\.(spec|e2e)\.ts$/],
                },
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'shebang-loader',
                            options: {
                                transpileOnly: true,
                                experimentalWatchApi: true,
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            new CheckerPlugin(),
            new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true }),
            new webpack.DefinePlugin({
                __IMAGE_VERSION__: JSON.stringify(version),
            }),

            new copyWebpackPlugin([
                {
                    context: './run-script',
                    from: '**/*.sh',
                    to: '',
                    ignore: ['dist/**', 'node_modules/**'],
                },
            ]),
        ].concat(
            generateTypings
                ? [] // add type checking if transpileOnly is set to false
                : new ForkTsCheckerWebpackPlugin(),
        ),
        resolve: {
            extensions: ['.ts', '.js', '.json'],
            mainFields: ['main'], //This is fix for this issue https://www.gitmemory.com/issue/bitinn/node-fetch/450/494475397
        },
        target: 'node',
        node: {
            __dirname: false,
        },
        output: {
            path: path.resolve('./dist'),
            filename: '[name].js',
            libraryTarget: 'umd',
        },
    };
}

module.exports = env => {
    const version = env ? env.version : 'dev';
    console.log(`Building for version : ${version}`);
    return [
        {
            ...getCommonConfig(version, false),
            name: 'ai-scan-cli',
            externals: ['puppeteer', 'yargs', 'axe-core', 'axe-puppeteer'],
            entry: {
                ['ai-scan-cli']: path.resolve('./src/cli.ts'),
            },
        },
        {
            ...getCommonConfig(version, true),
            name: 'ai-scan',
            externals: [nodeExternals()],
            entry: {
                ['index']: path.resolve('./src/index.ts'),
            },
        },
    ];
};

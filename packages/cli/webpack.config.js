// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyFilesPlugin = require('copy-webpack-plugin');

function getCommonConfig(version, generateTypings) {
    return {
        devtool: 'cheap-source-map',
        externals: ['apify', 'apify-shared', 'axe-core', '@axe-core/puppeteer', 'puppeteer', 'yargs', 'levelup', 'leveldown'],
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: generateTypings ? false : true, // transpileOnly=false generates typings
                                experimentalWatchApi: true,
                                configFile: generateTypings ? 'tsconfig.sdk.json' : 'tsconfig.json',
                                logInfoToStdOut: true,
                                logLevel: 'INFO',
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
            new webpack.BannerPlugin({ banner: generateTypings ? '' : '#!/usr/bin/env node', raw: true }),
            new webpack.DefinePlugin({
                __IMAGE_VERSION__: JSON.stringify(version),
            }),
            new copyFilesPlugin([{ from: './../crawler/dist/browser-imports.js', to: '.' }]),
        ].concat(generateTypings ? [] : new ForkTsCheckerWebpackPlugin()), // only add if transpileOnly is true
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

module.exports = (env) => {
    const version = env ? env.version : 'dev';
    console.log(`Building for version : ${version}`);
    return [
        {
            ...getCommonConfig(version, false),
            name: 'ai-scan-cli',
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

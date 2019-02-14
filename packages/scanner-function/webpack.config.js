const path = require('path');
const webpack = require('webpack');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');
var nodeExternals = require('webpack-node-externals');

module.exports = env => {
    const version = env ? env.version : 'dev';

    return {
        devtool: 'cheap-source-map',
        externals: [nodeExternals()],
        entry: {
            'scan-url': path.resolve('./scan-url/index.ts'),
            'crawl-url': path.resolve('./crawl-url/index.ts'),
            'send-scan-request': path.resolve('./send-scan-request/index.ts'),
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
        name: 'scanner',
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
                    from: 'host.json',
                    to: 'host.json',
                },
                {
                    context: './',
                    from: '**/function.json',
                    to: '',
                    ignore: ['dist/**'],
                },
                {
                    from: 'package*.json',
                    to: '',
                },
            ]),
        ],
        resolve: {
            modules: [path.resolve(__dirname, 'node_modules')],
            extensions: ['.ts', '.js', '.json'],
        },
        target: 'node',
    };
};

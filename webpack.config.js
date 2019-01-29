const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    devtool: 'cheap-source-map',
    entry: {
        'scan-url': path.resolve('./src/scanner/scan-url/index.ts'),
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
    output: {
        path: path.resolve('./dist/scanner'),
        filename: '[name]/index.js',
        libraryTarget: 'commonjs2',
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin(),
        new copyWebpackPlugin([
            {
                from: 'src/scanner/host.json',
                to: 'host.json',
            },
            {
                context: 'src/scanner',
                from: '**/function.json',
                to: '',
            },
        ]),
    ],
    resolve: {
        modules: [path.resolve(__dirname, 'node_modules')],
        extensions: ['.ts', '.js', 'json'],
    },
    target: 'node',
};

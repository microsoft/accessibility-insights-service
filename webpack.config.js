const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const uglifyJSPlugin = require('uglifyjs-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
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
        new uglifyJSPlugin({
            uglifyOptions: {
                ecma: 6,
            },
        }),
        new copyWebpackPlugin([
            {
                from: 'src/scanner/host.json',
                to: 'host.json',
            },
            {
                context: 'src/scanner',
                from: '**/*.json',
                to: '',
            },
            {
                context: 'src/scanner',
                from: '**/*.dat',
                to: '',
            },
        ]), // to copy dependencies
    ],
    resolve: {
        modules: [path.resolve(__dirname, 'node_modules')],
        extensions: ['.ts', '.js', 'json'],
    },
    target: 'node',
};

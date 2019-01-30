const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    devtool: 'cheap-source-map',
    externals: {
        bufferutil: 'commonjs bufferutil',
        'utf-8-validate': 'commonjs utf-8-validate',
    },
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
    node: {
        __dirname: false,
    },
    output: {
        path: path.resolve('./src/scanner/dist'),
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
                ignore: ['dist/**'],
            },
            {
                context: 'node_modules/puppeteer/',
                from: '.local-chromium/**',
                to: 'scan-url',
            },
        ]),
    ],
    resolve: {
        modules: [path.resolve(__dirname, 'node_modules')],
        extensions: ['.ts', '.js', '.json'],
    },
    target: 'node',
};

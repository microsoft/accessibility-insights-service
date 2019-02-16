const path = require('path');
const webpack = require('webpack');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = env => {
    const version = env ? env.version : 'dev';
    console.log(`Building for version : ${version}`);

    return {
        devtool: 'cheap-source-map',
        entry: {
            index: path.resolve('./index.ts'),
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
                    context: './',
                    from: '**/*.sh',
                    to: '',
                    ignore: ['dist/**', 'node_modules/**'],
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

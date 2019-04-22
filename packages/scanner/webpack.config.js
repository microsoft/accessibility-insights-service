const path = require('path');
const webpack = require('webpack');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const externalDeps = nodeExternals({
    whitelist: ['azure-client'],
});

module.exports = env => {
    const version = env ? env.version : 'dev';
    console.log(`Building for version : ${version}`);

    return {
        devtool: 'cheap-source-map',
        externals: [nodeExternals({ modulesFromFile: true })],
        entry: {
            ['scan-url']: path.resolve('./tasks/scan/index.ts'),
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
            filename: '[name]/[name].js',
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
            extensions: ['.ts', '.js', '.json'],
        },
        target: 'node',
    };
};

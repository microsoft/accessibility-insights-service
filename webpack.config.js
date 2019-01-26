const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const uglifyJSPlugin = require('uglifyjs-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        sample: path.resolve('./src/hello-world.ts'),
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
    name: 'sample-config',
    output: {
        path: path.resolve('./dist'),
        filename: '[name]/[name].js',
        libraryTarget: 'commonjs2',
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin(),
        new uglifyJSPlugin({
            uglifyOptions: {
                ecma: 6,
            },
        }),
        new copyWebpackPlugin(), // to copy dependencies
    ],
    resolve: {
        modules: [path.resolve(__dirname, 'node_modules')],
        extensions: ['.ts', '.js', 'json'],
    },
    target: 'node',
};

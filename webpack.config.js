const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

const nodeModules = {};

// requre all external npm packages as commonjs
fs
    .readdirSync('node_modules')
    .filter((x) => ['.bin'].indexOf(x) === -1)
    .forEach((mod) => {
        nodeModules[mod] = `commonjs ${mod}`;
    });

module.exports = {
    entry: './src/index.js',
    target: 'node',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'app.js',
    },
    plugins: [
        // setting env variables
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('development'),
            },
        }),
        new webpack.BannerPlugin(
            'require("source-map-support").install();',
            {
                raw: true, entryOnly: false,
            }
        ),
    ],
    module: {
        loaders: [
            // babel loader
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel',
            },
        ],
    },
    // external npm packages for requiring
    externals: nodeModules,
    devtool: 'sourcemap',
    node: {
        __dirname: false,
    },
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const fs = require('fs');
const packageJson = require('./package.json');
const getWebpackConfig = require('./webpack.config');

const allDependencies = packageJson.dependencies;

const webpackConfig = getWebpackConfig();
const externals = webpackConfig.externals ? webpackConfig.externals : [];

const externalDependencies = {};

externals.forEach((packageName) => {
    externalDependencies[packageName] = allDependencies[packageName];
});

const newPackageJson = {
    ...packageJson,
    scripts: {},
    dependencies: externalDependencies,
    devDependencies: {},
};

fs.writeFileSync('./dist/package.json', JSON.stringify(newPackageJson));

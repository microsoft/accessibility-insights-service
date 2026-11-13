// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const fs = require('fs');
const packageJson = require(process.cwd() + '/package.json');
const getWebpackConfig = require(process.cwd() + '/webpack.config');

const packageDependencies = packageJson.dependencies;

const webpackConfig = getWebpackConfig();
const webpackExternals = webpackConfig.externals ? webpackConfig.externals : [];

const imagePackageDependencies = {};
webpackExternals.forEach((packageName) => {
    if (packageDependencies.hasOwnProperty(packageName)) {
        imagePackageDependencies[packageName] = packageDependencies[packageName];
    } else {
        throw new Error(`Package '${packageName}' is not declared in package.json dependencies{} section.`);
    }
});

// Docker images use Node 20.15, which cannot require() ES modules. @typespec/ts-http-runtime >= 0.3.10
// depends on ESM-only http(s)-proxy-agent v9, so pin those to the CommonJS v7 line (same API).
// Remove once the images run Node >= 20.19 / 22.12.
const imagePackageOverrides = {
    '@typespec/ts-http-runtime': {
        'http-proxy-agent': '^7.0.2',
        'https-proxy-agent': '^7.0.6',
    },
};

const newPackageJson = {
    ...packageJson,
    scripts: undefined,
    dependencies: imagePackageDependencies,
    devDependencies: undefined,
    overrides: { ...packageJson.overrides, ...imagePackageOverrides },
};

fs.writeFileSync('./dist/package.json', JSON.stringify(newPackageJson, undefined, 4));

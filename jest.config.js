// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const baseConfig = require('./jest.config.base.js');

baseConfig.testPathIgnorePatterns.push('/e2e-tests/');

module.exports = {
    ...baseConfig,
    projects: ['<rootDir>/packages/*/jest.config.js'],
};

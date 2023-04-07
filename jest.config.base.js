// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

module.exports = {
    displayName: 'unit tests',
    clearMocks: true,
    verbose: true,
    testEnvironment: 'node',

    collectCoverage: true,
    coverageDirectory: '<rootDir>/test-results/unit/coverage',
    coverageReporters: ['text', 'lcov', 'cobertura'],
    collectCoverageFrom: [
        '<rootDir>/**/*.js',
        '<rootDir>/**/*.ts',
        '!<rootDir>/dist/**',
        '!<rootDir>/out/**',
        '!<rootDir>/**/jest.config.js',
        '!<rootDir>/**/prettier.config.js',
        '!<rootDir>/**/webpack.config.js',
        '!<rootDir>/**/node_modules/**',
        '!<rootDir>/**/test-results/**',
        '!<rootDir>/**/test-utilities/**',
        '!<rootDir>/**/dev-scripts/**',
        '!<rootDir>/**/jump-consistent-hash.*',
        '!<rootDir>/**/guid-generator.*',
    ],

    moduleDirectories: ['node_modules'],
    moduleFileExtensions: ['ts', 'js', 'json'],

    transform: {
        '^.+\\.(ts)$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.json',
            },
        ],
    },
    testMatch: ['**/*.spec.[tj]s'],
    testPathIgnorePatterns: ['/dist/', '/out/'],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: '<rootDir>/test-results/unit',
                outputName: 'junit.xml',
            },
        ],
        [
            'jest-html-reporter',
            {
                pageTitle: 'html report',
                outputPath: './test-results/unit/html-reporter/report.html',
            },
        ],
    ],
    setupFilesAfterEnv: ['jest-extended'],
};

module.exports = {
    clearMocks: true,
    displayName: 'scanner unit tests',
    globals: {
        'ts-jest': {
            tsConfig: '<rootDir>/tsconfig.json',
        },
    },
    moduleDirectories: ['node_modules'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    testPathIgnorePatterns: ['node_modules'],
    // This ensures that failures in beforeAll/beforeEach result in dependent tests not trying to run.
    // See https://github.com/facebook/jest/issues/2713
    testRunner: 'jest-circus/runner',
    transform: {
        '^.+\\.(ts)$': 'ts-jest',
    },
    testMatch: ['**/*.spec.ts'],
    verbose: true,
    coverageDirectory: './test-results/unit/coverage',
    coverageReporters: ['json', 'lcov', 'text', 'cobertura'],
    reporters: ['default', ['jest-junit', { outputDirectory: '.', outputName: './test-results/unit/junit.xml' }]],
};

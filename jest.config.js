const baseConfig = require('./jest.config.base.js');

module.exports = {
    ...baseConfig,
    projects: ['<rootDir>/packages/*/jest.config.js', '<rootDir>/packages/tools/*/jest.config.js'],
};

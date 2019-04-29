const baseConfig = require('../../jest.config.base');
const package = require('./package');

module.exports = {
    ...baseConfig,
    displayName: package.name,
};

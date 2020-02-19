const buildType = process.config.target_defaults
  ? process.config.target_defaults.default_configuration
  : /* istanbul ignore next */ 'Release';
module.exports = require(`./build/${buildType}/binding`);

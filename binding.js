const buildType = process.config.target_defaults
  ? process.config.target_defaults.default_configuration
  : /* istanbul ignore next */ 'Release';
module.exports = require(`node_modules/zstd-napi/build/${buildType}/binding`);

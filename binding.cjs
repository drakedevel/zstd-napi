const buildType =
  process.config.target_defaults?.default_configuration ?? 'Release';
module.exports = require(`./build/${buildType}/binding.node`);

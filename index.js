const buildType = process.config.target_defaults ?
  process.config.target_defaults.default_configuration :
  'Release';
const bindingPath = require.resolve(`./build/${buildType}/binding`);
const binding = require(bindingPath);

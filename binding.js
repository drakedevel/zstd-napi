const nodePreGyp = require('@mapbox/node-pre-gyp');
const path = require('path');
module.exports = require(nodePreGyp.find(path.join(__dirname, 'package.json')));

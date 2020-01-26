const fs = require('fs');
const {performance} = require('perf_hooks');

const buildType = process.config.target_defaults ?
  process.config.target_defaults.default_configuration :
  'Release';
const bindingPath = require.resolve(`./build/${buildType}/binding`);
const binding = require(bindingPath);

const ctx = new binding.CCtx();
const inBuf = fs.readFileSync('dummy-data/macbeth-300');
const outBuf = Buffer.alloc(inBuf.length * 2);

const cdict = new binding.CDict(fs.readFileSync('dummy-data-4k.bin'), 3);

const startT = performance.now();
const len = ctx.compressUsingCDict(inBuf, outBuf, cdict);
const endT = performance.now();
if (len > 0) {
  fs.writeFileSync('out.bin', outBuf.slice(0, len));
}
console.log((endT - startT));

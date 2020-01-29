const fs = require('fs');
const {performance} = require('perf_hooks');

const buildType = process.config.target_defaults ?
  process.config.target_defaults.default_configuration :
  'Release';
const bindingPath = require.resolve(`./build/${buildType}/binding`);
const binding = require(bindingPath);

console.log(binding.versionNumber(), binding.versionString());
console.log(binding.minCLevel(), binding.maxCLevel());

const ctx = new binding.CCtx();
const inBuf = fs.readFileSync('dummy-data/macbeth-300');
const outBuf = Buffer.alloc(binding.compressBound(inBuf.length));

const cdict = new binding.CDict(fs.readFileSync('dummy-data-4k.bin'), 3);

const startT = performance.now();
const len = ctx.compressUsingCDict(outBuf, inBuf, cdict);
const endT = performance.now();
if (len > 0) {
  fs.writeFileSync('out.bin', outBuf.slice(0, len));
}
console.log((endT - startT));

console.log(len, binding.findFrameCompressedSize(outBuf));
console.log(binding.getFrameContentSize(outBuf.slice(0, len)));
console.log(binding.getFrameContentSize(fs.readFileSync('noframe.zst')));

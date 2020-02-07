import * as fs from 'fs';
import * as path from 'path';
import * as binding from '../binding';

// Minimal dictionary (generated with zstd --train on random hex)
const minDict = fs.readFileSync(path.join(__dirname, 'data', 'minimal.dct'));
const minDictId = 598886516;

// Minimal frame compressed with the minDict dictionary
const minDictFrame = hex('28b52ffd237448b22300010000');

// Minimal frame with content size known (0 bytes)
const minEmptyFrame = hex('28b52ffd2000010000');

// Minimal frame with content size unknown
const minStreamFrame = hex('28b52ffd0000010000');

// Frame with content 'abc123' repeated five times
const abcFrame = hex('28b52ffd201e650000306162633132330100014b11');
const abcDictFrame = hex('28b52ffd237448b2231e650000306162633132330100014b11');
const abcFrameContent = Buffer.from('abc123abc123abc123abc123abc123');

function hex(data: string) {
  return Buffer.from(data, 'hex');
}

function testCompress(input: Buffer, expected: Buffer,
                      f: (dest: Buffer, src: Buffer) => number) {
  const output = Buffer.alloc(binding.compressBound(input.length));
  const len = f(output, input);
  expect(output.slice(0, len).equals(expected)).toBe(true);
}

function testDecompress(input: Buffer, expected: Buffer,
                        f: (dest: Buffer, src: Buffer) => number) {
  const output = Buffer.alloc(expected.length);
  const len = f(output, input);
  expect(output.slice(0, len).equals(expected)).toBe(true);
}

describe('CCtx', () => {
  let cctx: binding.CCtx;

  beforeEach(() => {
    cctx = new binding.CCtx();
  });

  test('#compress works', () => {
    testCompress(abcFrameContent, abcFrame,
                 (dest, src) => cctx.compress(dest, src, 3));
  });

  test('#compressUsingCDict works', () => {
    const cdict = new binding.CDict(minDict, 3);
    testCompress(abcFrameContent, abcDictFrame,
                 (dest, src) => cctx.compressUsingCDict(dest, src, cdict));
  });

  test('#setPledgedSrcSize works', () => {
    // TODO: Find some way to distinguish this from a no-op
    cctx.setPledgedSrcSize(1);
  });

  test('#reset works', () => {
    // TODO: Find some way to distinguish this from a no-op
    cctx.reset(binding.ResetDirective.sessionAndParameters);
  });

  test('#compress2 works', () => {
    cctx.setParameter(binding.CParameter.contentSizeFlag, 0);
    cctx.setParameter(binding.CParameter.windowLog, 10);
    testCompress(Buffer.alloc(0), minStreamFrame,
                 (dst, src) => cctx.compress2(dst, src));
  });
});

describe('DCtx', () => {
  let dctx: binding.DCtx;

  beforeEach(() => {
    dctx = new binding.DCtx();
  });

  test('#decompress works', () => {
    testDecompress(abcFrame, abcFrameContent,
                   output => dctx.decompress(output, abcFrame));
  });

  test('#decompressUsingDDict works', () => {
    const ddict = new binding.DDict(minDict);
    testDecompress(abcDictFrame, abcFrameContent,
                   output => dctx.decompressUsingDDict(output, abcDictFrame, ddict));
  });

  test('#setParameter works', () => {
    // TODO: Find some way to distinguish this from a no-op
    dctx.setParameter(binding.DParameter.windowLogMax, 10);
  });

  test('#reset works', () => {
    // TODO: Find some way to distinguish this from a no-op
    dctx.reset(binding.ResetDirective.sessionAndParameters);
  });
});

describe('DDict', () => {
  test('#getDictID works', () => {
    const ddict = new binding.DDict(minDict);
    expect(ddict.getDictID()).toBe(minDictId);
  });
});

test('versionString works', () => {
  expect(binding.versionString()).toBe('1.4.4');
});

test('versionNumber works', () => {
  expect(binding.versionNumber()).toBe(10404);
});

describe('getFrameContentSize', () => {
  test('works on normal frames', () => {
    expect(binding.getFrameContentSize(minEmptyFrame)).toBe(0);
  });
  test('returns null when size is unknown', () => {
    expect(binding.getFrameContentSize(minStreamFrame)).toBe(null);
  });
});

test('findFrameCompressedSize works', () => {
  expect(binding.findFrameCompressedSize(minEmptyFrame)).toBe(minEmptyFrame.length);
});

test('compressBound works', () => {
  expect(binding.compressBound(0)).toBeGreaterThanOrEqual(minEmptyFrame.length);
});

test('minCLevel works', () => {
  expect(binding.minCLevel()).toBeLessThan(0);
});

test('maxCLevel works', () => {
  expect(binding.maxCLevel()).toBeGreaterThan(0);
});

function expectBounds(bounds: binding.Bounds) {
  expect(bounds).toMatchObject({
    lowerBound: expect.any(Number),
    upperBound: expect.any(Number),
  });
  expect(bounds.lowerBound).toBeLessThanOrEqual(bounds.upperBound);
}

test('cParamGetBounds works', () => {
  for (const [k, v] of Object.entries(binding.CParameter)) {
    if (typeof v === 'number') {
      expectBounds(binding.cParamGetBounds(v));
    }
  }
});

test('dParamGetBounds works', () => {
  for (const [k, v] of Object.entries(binding.DParameter)) {
    if (typeof v === 'number') {
      expectBounds(binding.dParamGetBounds(v));
    }
  }
});

test('getDictIDFromDict works', () => {
  expect(binding.getDictIDFromDict(minDict)).toBe(minDictId);
});

test('wrapGetDictIDFromFrame works', () => {
  expect(binding.getDictIDFromFrame(minDictFrame)).toBe(minDictId);
});

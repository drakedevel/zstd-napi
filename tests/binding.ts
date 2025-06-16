import * as events from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import * as binding from '../binding';

// Minimal dictionary (generated with zstd --train on random hex)
const minDict = fs.readFileSync(path.join(__dirname, 'data', 'minimal.dct'));
const minDictId = 598886516;

function hex(data: string): Buffer {
  return Buffer.from(data, 'hex');
}

// Minimal frame compressed with the minDict dictionary
const minDictFrame = hex('28b52ffd237448b22300010000');

// Minimal frame with content size known (0 bytes)
const minEmptyFrame = hex('28b52ffd2000010000');

// Minimal frame with content size unknown
const minStreamFrame = hex('28b52ffd0000010000');

// Frame with content 'abc123' repeated five times
const abcFrame = hex('28b52ffd201e650000306162633132330100014b11');
const abcDictFrame = hex('28b52ffd237448b2231e650000306162633132330100014b11');
const abcStreamFrame = hex('28b52ffd0058650000306162633132330100014b11');
const abcFrameContent = Buffer.from('abc123abc123abc123abc123abc123');

function expectCompress(
  input: Buffer,
  expected: Buffer,
  f: (dest: Buffer, src: Buffer) => number,
): void {
  const output = Buffer.alloc(binding.compressBound(input.length));
  const len = f(output, input);
  expect(output.subarray(0, len).equals(expected)).toBe(true);
}

function expectDecompress(
  input: Buffer,
  expected: Buffer,
  f: (dest: Buffer, src: Buffer) => number,
): void {
  const output = Buffer.alloc(expected.length);
  const len = f(output, input);
  expect(output.subarray(0, len).equals(expected)).toBe(true);
}

describe('CCtx', () => {
  let cctx: binding.CCtx;

  beforeEach(() => {
    cctx = new binding.CCtx();
  });

  test('#compress works', () => {
    expectCompress(abcFrameContent, abcFrame, (dest, src) =>
      cctx.compress(dest, src, 3),
    );
  });

  test('#compressUsingDict works', () => {
    expectCompress(abcFrameContent, abcDictFrame, (dest, src) =>
      cctx.compressUsingDict(dest, src, minDict, 3),
    );
  });

  test('#compressUsingCDict works', () => {
    const cdict = new binding.CDict(minDict, 3);
    expectCompress(abcFrameContent, abcDictFrame, (dest, src) =>
      cctx.compressUsingCDict(dest, src, cdict),
    );
  });

  test('#compressUsingCDict rejects invalid dictionary objects', () => {
    expect(() => {
      const ddict = new binding.DDict(minDict);
      // @ts-expect-error: testing invalid value
      cctx.compressUsingCDict(Buffer.alloc(0), Buffer.alloc(0), ddict);
    }).toThrowErrorMatchingInlineSnapshot(`"Native object tag mismatch"`);
  });

  test('#setPledgedSrcSize works', () => {
    const srcBuf = Buffer.from('hello');
    const dstBuf = Buffer.alloc(binding.compressBound(srcBuf.length));
    cctx.setPledgedSrcSize(srcBuf.length + 1);
    cctx.compressStream2(dstBuf, srcBuf, binding.EndDirective.continue);
    expect(() => {
      cctx.compressStream2(dstBuf, Buffer.alloc(0), binding.EndDirective.end);
    }).toThrowErrorMatchingInlineSnapshot(`"Src size is incorrect"`);
  });

  test('#reset works', () => {
    const srcBuf = Buffer.from('hello');
    const dstBuf = Buffer.alloc(binding.compressBound(srcBuf.length * 2));
    const [, dstProd] = cctx.compressStream2(
      dstBuf,
      srcBuf,
      binding.EndDirective.continue,
    );
    expect(dstProd).toBe(0);
    cctx.reset(binding.ResetDirective.sessionAndParameters);
    const [, dstProd2] = cctx.compressStream2(
      dstBuf,
      srcBuf,
      binding.EndDirective.end,
    );
    expectDecompress(dstBuf.subarray(0, dstProd2), srcBuf, binding.decompress);
  });

  test('#compress2 works', () => {
    cctx.setParameter(binding.CParameter.contentSizeFlag, 0);
    cctx.setParameter(binding.CParameter.windowLog, 10);
    expectCompress(Buffer.alloc(0), minStreamFrame, (dst, src) =>
      cctx.compress2(dst, src),
    );
  });

  test('#compressStream2 works', () => {
    const output = Buffer.alloc(abcStreamFrame.length);
    let [toFlush, dstProduced, srcConsumed] = cctx.compressStream2(
      output,
      abcFrameContent,
      binding.EndDirective.continue,
    );
    expect(toFlush).toBe(0);
    expect(dstProduced).toBe(0);
    expect(srcConsumed).toBe(abcFrameContent.length);
    [toFlush, dstProduced, srcConsumed] = cctx.compressStream2(
      output,
      Buffer.alloc(0),
      binding.EndDirective.end,
    );
    expect(toFlush).toBe(0);
    expect(dstProduced).toBe(output.length);
    expect(srcConsumed).toBe(0);
    expect(output.equals(abcStreamFrame)).toBe(true);
  });

  test('#loadDictionary works', () => {
    cctx.loadDictionary(minDict);
    expectCompress(abcFrameContent, abcDictFrame, (dst, src) =>
      cctx.compress2(dst, src),
    );
  });
});

describe('CDict', () => {
  test('constructor errors on corrupt dictionary', () => {
    expect(() => {
      new binding.CDict(minDict.subarray(0, 32), 3);
    }).toThrow('Failed to create CDict');
  });

  test('#getDictID works', () => {
    const cdict = new binding.CDict(minDict, 3);
    expect(cdict.getDictID()).toBe(minDictId);
  });
});

describe('DCtx', () => {
  let dctx: binding.DCtx;

  beforeEach(() => {
    dctx = new binding.DCtx();
  });

  test('#decompress works', () => {
    expectDecompress(abcFrame, abcFrameContent, (output) =>
      dctx.decompress(output, abcFrame),
    );
  });

  test('#decompressStream works', () => {
    const output = Buffer.alloc(abcFrameContent.length);
    let [inputHint, dstProduced, srcConsumed] = dctx.decompressStream(
      output,
      abcStreamFrame.subarray(0, 12),
    );
    expect(inputHint).toBe(abcStreamFrame.length - 12);
    expect(dstProduced).toBe(0);
    expect(srcConsumed).toBe(12);
    [inputHint, dstProduced, srcConsumed] = dctx.decompressStream(
      output,
      abcStreamFrame.subarray(srcConsumed),
    );
    expect(inputHint).toBe(0);
    expect(dstProduced).toBe(abcFrameContent.length);
    expect(srcConsumed).toBe(abcStreamFrame.length - 12);
    expect(output.equals(abcFrameContent)).toBe(true);
  });

  test('#decompressUsingDict works', () => {
    expectDecompress(abcDictFrame, abcFrameContent, (output) =>
      dctx.decompressUsingDict(output, abcDictFrame, minDict),
    );
  });

  test('#decompressUsingDDict works', () => {
    const ddict = new binding.DDict(minDict);
    expectDecompress(abcDictFrame, abcFrameContent, (output) =>
      dctx.decompressUsingDDict(output, abcDictFrame, ddict),
    );
  });

  test('#decompressUsingDDict rejects invalid dictionary objects', () => {
    expect(() => {
      const cdict = new binding.CDict(minDict, 3);
      // @ts-expect-error: testing invalid value
      dctx.decompressUsingDDict(Buffer.alloc(0), Buffer.alloc(0), cdict);
    }).toThrowErrorMatchingInlineSnapshot(`"Native object tag mismatch"`);
  });

  test('#setParameter works', () => {
    dctx.setParameter(binding.DParameter.windowLogMax, 10);
    const { upperBound } = binding.dParamGetBounds(
      binding.DParameter.windowLogMax,
    );
    expect(() => {
      dctx.setParameter(binding.DParameter.windowLogMax, upperBound + 1);
    }).toThrowErrorMatchingInlineSnapshot(`"Parameter is out of bound"`);
  });

  test('#reset works', () => {
    const dstBuf = Buffer.alloc(1);
    const [, , consumed1] = dctx.decompressStream(
      dstBuf,
      minEmptyFrame.subarray(0, 4),
    );
    expect(consumed1).toBe(4);
    dctx.reset(binding.ResetDirective.sessionAndParameters);
    const [, , consumed2] = dctx.decompressStream(dstBuf, minEmptyFrame);
    expect(consumed2).toBe(minEmptyFrame.length);
  });

  test('#loadDictionary works', () => {
    dctx.loadDictionary(minDict);
    expectDecompress(abcDictFrame, abcFrameContent, (dst, src) =>
      dctx.decompress(dst, src),
    );
  });
});

describe('DDict', () => {
  test('constructor errors on corrupt dictionary', () => {
    expect(() => {
      new binding.DDict(minDict.subarray(0, 32));
    }).toThrow('Failed to create DDict');
  });

  test('#getDictID works', () => {
    const ddict = new binding.DDict(minDict);
    expect(ddict.getDictID()).toBe(minDictId);
  });
});

test('versionString works', () => {
  expect(binding.versionString()).toBe('1.5.7');
});

test('versionNumber works', () => {
  expect(binding.versionNumber()).toBe(10507);
});

test('compress works', () => {
  expectCompress(abcFrameContent, abcFrame, (dest, src) =>
    binding.compress(dest, src, 3),
  );
});

test('decompress works', () => {
  expectDecompress(abcFrame, abcFrameContent, (dest, src) =>
    binding.decompress(dest, src),
  );
});

describe('getFrameContentSize', () => {
  test('works on normal frames', () => {
    expect(binding.getFrameContentSize(minEmptyFrame)).toBe(0);
  });
  test('returns null when size is unknown', () => {
    expect(binding.getFrameContentSize(minStreamFrame)).toBeNull();
  });
  test('throws error when frame is corrupt', () => {
    expect(() => {
      binding.getFrameContentSize(minEmptyFrame.subarray(0, 4));
    }).toThrowErrorMatchingInlineSnapshot(`"Could not parse Zstandard header"`);
  });
});

test('findFrameCompressedSize works', () => {
  expect(binding.findFrameCompressedSize(minEmptyFrame)).toBe(
    minEmptyFrame.length,
  );
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

test('defaultCLevel works', () => {
  expect(binding.defaultCLevel()).toBe(3);
});

function expectBounds(bounds: binding.Bounds): void {
  expect(bounds).toMatchObject({
    lowerBound: expect.any(Number),
    upperBound: expect.any(Number),
  });
  expect(bounds.lowerBound).toBeLessThanOrEqual(bounds.upperBound);
}

test('cParamGetBounds works', () => {
  for (const v of Object.values(binding.CParameter)) {
    if (typeof v === 'number') {
      expectBounds(binding.cParamGetBounds(v));
    }
  }
});

test('dParamGetBounds works', () => {
  for (const v of Object.values(binding.DParameter)) {
    if (typeof v === 'number') {
      expectBounds(binding.dParamGetBounds(v));
    }
  }
});

test('cStreamInSize works', () => {
  expect(binding.cStreamInSize()).toBeGreaterThan(0);
});

test('cStreamOutSize works', () => {
  expect(binding.cStreamOutSize()).toBeGreaterThan(0);
});

test('dStreamInSize works', () => {
  expect(binding.dStreamInSize()).toBeGreaterThan(0);
});

test('dStreamOutSize works', () => {
  expect(binding.dStreamOutSize()).toBeGreaterThan(0);
});

test('getDictIDFromDict works', () => {
  expect(binding.getDictIDFromDict(minDict)).toBe(minDictId);
});

test('wrapGetDictIDFromFrame works', () => {
  expect(binding.getDictIDFromFrame(minDictFrame)).toBe(minDictId);
});

test('loading from multiple threads works', async () => {
  async function runInWorker(): Promise<number> {
    const worker = new Worker('./binding.js');
    return (await events.once(worker, 'exit'))[0];
  }

  await expect(runInWorker()).resolves.toBe(0);
  await expect(runInWorker()).resolves.toBe(0);
});

test('passing wrong argument count throws error', () => {
  expect(() => {
    // @ts-expect-error: deliberately passing wrong arguments
    binding.compressBound();
  }).toThrowErrorMatchingInlineSnapshot(`"Expected 1 arguments, got 0"`);
});

test('libzstd errors are propagated', () => {
  expect(() => {
    binding.compress(Buffer.alloc(0), Buffer.alloc(0), 3);
  }).toThrowErrorMatchingInlineSnapshot(`"Destination buffer is too small"`);
});

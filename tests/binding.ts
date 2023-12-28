import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import binding from '../binding';

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
  expect(output.slice(0, len).equals(expected)).toBe(true);
}

function expectDecompress(
  input: Buffer,
  expected: Buffer,
  f: (dest: Buffer, src: Buffer) => number,
): void {
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
      new binding.CDict(minDict.slice(0, 32), 3);
    }).toThrow('Failed to create CDict');
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
      abcStreamFrame.slice(0, 12),
    );
    expect(inputHint).toBe(abcStreamFrame.length - 12);
    expect(dstProduced).toBe(0);
    expect(srcConsumed).toBe(12);
    [inputHint, dstProduced, srcConsumed] = dctx.decompressStream(
      output,
      abcStreamFrame.slice(srcConsumed),
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

  test('#setParameter works', () => {
    // TODO: Find some way to distinguish this from a no-op
    dctx.setParameter(binding.DParameter.windowLogMax, 10);
  });

  test('#reset works', () => {
    // TODO: Find some way to distinguish this from a no-op
    dctx.reset(binding.ResetDirective.sessionAndParameters);
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
      new binding.DDict(minDict.slice(0, 32));
    }).toThrow('Failed to create DDict');
  });

  test('#getDictID works', () => {
    const ddict = new binding.DDict(minDict);
    expect(ddict.getDictID()).toBe(minDictId);
  });
});

test('versionString works', () => {
  expect(binding.versionString()).toBe('1.5.5');
});

test('versionNumber works', () => {
  expect(binding.versionNumber()).toBe(10505);
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
      binding.getFrameContentSize(minEmptyFrame.slice(0, 4));
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
    return new Promise((resolve, reject) =>
      new Worker('require("./binding")', { eval: true })
        .on('error', reject)
        .on('exit', resolve),
    );
  }

  expect(await runInWorker()).toBe(0);
  expect(await runInWorker()).toBe(0);
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

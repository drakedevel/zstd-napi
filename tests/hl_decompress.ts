import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { expectTypeOf } from 'expect-type';
import * as binding from '../binding';
import {
  Decompressor,
  DecompressParameters,
  DecompressStream,
  compress,
  decompress,
} from '../lib';

// Minimal dictionary (generated with zstd --train on random hex)
const minDict = fs.readFileSync(path.join(__dirname, 'data', 'minimal.dct'));

function hex(data: string): Buffer {
  return Buffer.from(data, 'hex');
}

// Frame with content 'abc123' repeated five times
const abcDictFrame = hex('28b52ffd237448b2231e650000306162633132330100014b11');
const abcFrameContent = Buffer.from('abc123abc123abc123abc123abc123');

describe('Decompressor', () => {
  let decompressor: Decompressor;

  beforeEach(() => {
    decompressor = new Decompressor();
  });

  test('#decompress handles frames with content size', () => {
    const original = Buffer.from('hello');
    const input = compress(Buffer.from('hello'));
    expect(binding.getFrameContentSize(input)).toBe(original.length);
    expect(decompressor.decompress(input).equals(original)).toBe(true);
  });

  test('#decompress handles frames without content size', () => {
    const original = Buffer.from('hello');
    const input = compress(Buffer.from('hello'), { contentSizeFlag: false });
    expect(binding.getFrameContentSize(input)).toBeNull();
    expect(decompressor.decompress(input).equals(original)).toBe(true);
  });

  test('#decompress decompresses all frames in input', () => {
    const originals = [Buffer.from('hello'), Buffer.from(' world')];
    const frames = originals.map((b) =>
      compress(b, { contentSizeFlag: false }),
    );
    const input = Buffer.concat(frames);
    const expected = Buffer.concat(originals);
    expect(decompressor.decompress(input).equals(expected)).toBe(true);
  });

  test('#decompress handles large inputs without content size', () => {
    // 1MiB of random data with roughly 2x compression ratio
    const chunks = [];
    for (let i = 0; i < 1024; i++) {
      const chunk = randomBytes(1024);
      chunks.push(chunk, chunk);
    }
    const original = Buffer.concat(chunks);
    const input = compress(original, { contentSizeFlag: false });
    expect(original.length / input.length).toBeCloseTo(2, 1);
    expect(decompressor.decompress(input).equals(original)).toBe(true);
  });

  test('#decompress handles high-ratio inputs without content size', () => {
    // 1MiB of zeros, which has a very high compression ratio
    const original = Buffer.alloc(1024 * 1024);
    const input = compress(original, { contentSizeFlag: false });
    expect(input.length).toBeLessThan(128);
    expect(decompressor.decompress(input).equals(original)).toBe(true);
  });

  test('#loadDictionary works', () => {
    using loadDict = jest.spyOn(decompressor['dctx'], 'loadDictionary');

    const dictBuf = Buffer.alloc(0);
    decompressor.loadDictionary(dictBuf);
    expect(loadDict).toHaveBeenCalledWith(dictBuf);
  });

  test('#setParameters resets other parameters', () => {
    using reset = jest.spyOn(decompressor['dctx'], 'reset');
    using setParam = jest.spyOn(decompressor['dctx'], 'setParameter');

    decompressor.setParameters({ windowLogMax: 10 });
    expect(reset).toHaveBeenCalledWith(binding.ResetDirective.parameters);
    expect(setParam).toHaveBeenCalledWith(binding.DParameter.windowLogMax, 10);
  });

  test('#updateParameters does not reset parameters', () => {
    using reset = jest.spyOn(decompressor['dctx'], 'reset');
    using setParam = jest.spyOn(decompressor['dctx'], 'setParameter');

    decompressor.updateParameters({ windowLogMax: 0 });
    expect(reset).not.toHaveBeenCalled();
    expect(setParam).toHaveBeenCalled();
  });

  test('#updateParameters rejects invalid parameter names', () => {
    using setParam = jest.spyOn(decompressor['dctx'], 'setParameter');

    expect(() => {
      // @ts-expect-error: testing invalid key
      decompressor.updateParameters({ invalidName: 42 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid parameter name: invalidName"`,
    );
    expect(() => {
      // @ts-expect-error: testing invalid value type
      decompressor.updateParameters({ windowLogMax: 'invalid' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid type for parameter: windowLogMax"`,
    );
    expect(setParam).not.toHaveBeenCalled();
  });

  test('#updateParameters ignores undefined values', () => {
    using setParam = jest.spyOn(decompressor['dctx'], 'setParameter');

    decompressor.updateParameters({ windowLogMax: undefined });
    expect(setParam).not.toHaveBeenCalled();
  });
});

describe('DecompressParameters', () => {
  test('matches binding.DParameter', () => {
    expectTypeOf<keyof DecompressParameters>().toEqualTypeOf<
      keyof typeof binding.DParameter
    >();
  });
});

describe('DecompressStream', () => {
  let stream: DecompressStream;
  let chunks: Buffer[];
  const dataHandler = jest.fn((chunk: Buffer) => chunks.push(chunk));
  const errorHandler = jest.fn();

  beforeEach(() => {
    chunks = [];
    stream = new DecompressStream();
    stream.on('data', dataHandler);
    stream.on('error', errorHandler);
  });

  afterEach(() => {
    expect(errorHandler).not.toHaveBeenCalled();
  });

  test('basic functionality works', (done) => {
    const original = Buffer.from('hello');

    stream.on('end', () => {
      expect(Buffer.concat(chunks).equals(original)).toBe(true);
      return done();
    });

    stream.end(compress(original));
  });

  test('#_transform correctly propagates errors', (done) => {
    using _decompress = jest
      .spyOn(stream['dctx'], 'decompressStream')
      .mockImplementationOnce(() => {
        throw new Error('Simulated error');
      });

    const writeCb = jest.fn();
    stream.off('error', errorHandler);
    stream.on('error', (err) => {
      expect(err).toMatchObject({ message: 'Simulated error' });
      expect(writeCb).toHaveBeenCalledWith(err);
      return done();
    });
    stream.write('', writeCb);
  });

  test('#_flush fails if in the middle of a frame', (done) => {
    const input = compress(Buffer.from('hello'));

    stream.off('error', errorHandler);
    stream.on('error', (err) => {
      expect(err).toMatchInlineSnapshot(
        `[Error: Stream ended in middle of compressed data frame]`,
      );
      return done();
    });

    stream.end(input.subarray(0, input.length - 1));
  });

  test('flushes complete frames eagerly', (done) => {
    const orig1 = Buffer.from('hello');
    const orig2 = Buffer.from(' world');
    const original = Buffer.concat([orig1, orig2]);
    stream.write(compress(orig1), () => {
      expect(Buffer.concat(chunks).equals(orig1)).toBe(true);
      stream.write(compress(orig2), () => {
        expect(Buffer.concat(chunks).equals(original)).toBe(true);
        stream.end();
        return done();
      });
    });
  });

  test('handles multiple frames in single write', (done) => {
    const orig1 = Buffer.from('hello');
    const orig2 = Buffer.from(' world');
    const original = Buffer.concat([orig1, orig2]);
    stream.on('end', () => {
      expect(Buffer.concat(chunks).equals(original)).toBe(true);
      return done();
    });

    stream.end(Buffer.concat([compress(orig1), compress(orig2)]));
  });

  test('handles output that exactly matches buffer size', (done) => {
    const original = randomBytes(binding.dStreamOutSize());

    stream.on('end', () => {
      expect(Buffer.concat(chunks).equals(original)).toBe(true);
      return done();
    });

    stream.write(compress(original), () => {
      // Verify we only got one block
      expect(chunks).toHaveLength(1);
      stream.end();
    });
  });

  test('handles output larger than buffer size', (done) => {
    const original = randomBytes(binding.dStreamOutSize() + 1);

    stream.on('end', () => {
      expect(Buffer.concat(chunks).equals(original)).toBe(true);
      return done();
    });

    stream.write(compress(original), () => {
      // Verify we actually got two blocks out of one write
      expect(chunks).toHaveLength(2);
      stream.end();
    });
  });

  test('#loadDictionary works', () => {
    using loadDict = jest.spyOn(stream['dctx'], 'loadDictionary');

    const dictBuf = Buffer.alloc(0);
    stream.loadDictionary(dictBuf);
    expect(loadDict).toHaveBeenCalledWith(dictBuf);
  });

  test('#setParameters works', () => {
    using reset = jest.spyOn(stream['dctx'], 'reset');
    using setParam = jest.spyOn(stream['dctx'], 'setParameter');

    stream.setParameters({ windowLogMax: 10 });
    expect(reset).toHaveBeenCalledWith(binding.ResetDirective.parameters);
    expect(setParam).toHaveBeenCalledWith(binding.DParameter.windowLogMax, 10);
  });

  test('#updateParameters works', () => {
    using reset = jest.spyOn(stream['dctx'], 'reset');
    using setParam = jest.spyOn(stream['dctx'], 'setParameter');

    stream.updateParameters({ windowLogMax: 15 });
    expect(reset).not.toHaveBeenCalled();
    expect(setParam).toHaveBeenCalledWith(binding.DParameter.windowLogMax, 15);
  });

  test('dictionary decompression works', (done) => {
    stream.loadDictionary(minDict);

    stream.on('end', () => {
      const result = Buffer.concat(chunks);
      expect(result.equals(abcFrameContent)).toBe(true);
      return done();
    });

    stream.end(abcDictFrame);
  });
});

describe('decompress', () => {
  test('basic functionality works', () => {
    const original = Buffer.from('hello');
    expect(decompress(compress(original)).equals(original)).toBe(true);
  });
});

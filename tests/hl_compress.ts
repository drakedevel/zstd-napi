/* eslint jest/no-done-callback: 0 */
import * as assert from 'assert/strict';
import { randomBytes } from 'crypto';
import { expectTypeOf } from 'expect-type';
import * as binding from '../binding';
import {
  Compressor,
  CompressParameters,
  CompressStream,
  compress,
  decompress,
} from '../lib';

const mockBinding: jest.Mocked<typeof binding> =
  jest.createMockFromModule('../binding');

function expectDecompress(input: Buffer, expected: Buffer): void {
  const output = decompress(input);
  expect(output.equals(expected)).toBe(true);
}

describe('Compressor', () => {
  let compressor: Compressor;

  beforeEach(() => {
    jest.clearAllMocks();
    compressor = new Compressor();
  });

  test('#compress compresses data', () => {
    const input = Buffer.from('hello');
    const output = compressor.compress(input);
    expectDecompress(output, input);
  });

  test('#compress scratch buffer can be re-used', () => {
    expect(compressor['scratchBuf']).toBeNull();

    // Verify opportunistic buffer-saving
    const input1 = Buffer.from('hello');
    const output1 = compressor.compress(input1);
    expectDecompress(output1, input1);
    expect(compressor['scratchBuf']).not.toBeNull();
    const scratch1 = compressor['scratchBuf'];

    // Verify scratch buffer re-use
    const output2 = compressor.compress(input1);
    expectDecompress(output2, input1);
    expect(compressor['scratchBuf']).toBe(scratch1);

    // Verify scratch buffer is preserved if not used
    const input3 = randomBytes(128 * 1024 + 1);
    const output3 = compressor.compress(input3);
    expectDecompress(output3, input3);
    expect(compressor['scratchBuf']).toBe(scratch1);
  });

  test('#compress scratch buffer can be stolen', () => {
    expect(compressor['scratchBuf']).toBeNull();

    // Prime with highly-compressible data to ensure buffer is saved
    compressor.compress(Buffer.alloc(256));
    expect(compressor['scratchBuf']).not.toBeNull();
    const scratch = compressor['scratchBuf'];

    // Compress incompressible data to fill scratch buffer
    const input = randomBytes(256);
    const output = compressor.compress(input);
    expectDecompress(output, input);

    // Verify buffer was stolen
    expect(compressor['scratchBuf']).toBeNull();
    expect(output.buffer).toBe(scratch?.buffer);
  });

  test('#loadDictionary works', () => {
    compressor['cctx'] = new mockBinding.CCtx();

    const dictBuf = Buffer.alloc(0);
    compressor.loadDictionary(dictBuf);
    expect(mockBinding.CCtx.prototype.loadDictionary).toHaveBeenCalledWith(
      dictBuf,
    );
  });

  test('#setParameters resets other parameters', () => {
    compressor['cctx'] = new mockBinding.CCtx();

    compressor.setParameters({ compressionLevel: 0 });
    expect(mockBinding.CCtx.prototype.reset).toHaveBeenCalledWith(
      binding.ResetDirective.parameters,
    );
    expect(mockBinding.CCtx.prototype.setParameter).toHaveBeenCalledWith(
      binding.CParameter.compressionLevel,
      0,
    );
  });

  test('#updateParameters does not reset parameters', () => {
    compressor['cctx'] = new mockBinding.CCtx();

    compressor.updateParameters({ compressionLevel: 0 });
    expect(mockBinding.CCtx.prototype.reset).not.toHaveBeenCalled();
    expect(mockBinding.CCtx.prototype.setParameter).toHaveBeenCalled();
  });

  test('#updateParameters maps parameters correctly', () => {
    compressor['cctx'] = new mockBinding.CCtx();

    // Set one parameter of each type
    compressor.updateParameters({
      compressionLevel: 9,
      enableLongDistanceMatching: true,
      strategy: 'lazy',
    });

    // Verify types got mapped correctly
    const setParam = mockBinding.CCtx.prototype.setParameter;
    expect(setParam).toHaveBeenCalledTimes(3);
    expect(setParam).toHaveBeenCalledWith(
      binding.CParameter.compressionLevel,
      9,
    );
    expect(setParam).toHaveBeenCalledWith(
      binding.CParameter.enableLongDistanceMatching,
      1,
    );
    expect(setParam).toHaveBeenCalledWith(
      binding.CParameter.strategy,
      binding.Strategy.lazy,
    );
  });

  test('#updateParameters rejects invalid parameter names/types', () => {
    compressor['cctx'] = new mockBinding.CCtx();

    expect(() => {
      // @ts-expect-error: deliberately passing wrong arguments
      compressor.updateParameters({ invalidName: 42 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid parameter name: invalidName"`,
    );
    expect(() => {
      // @ts-expect-error: deliberately passing wrong arguments
      compressor.updateParameters({ compressionLevel: 'invalid' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid type for parameter: compressionLevel"`,
    );
    expect(mockBinding.CCtx.prototype.setParameter).not.toHaveBeenCalled();
  });

  test('#updateParameters ignores undefined values', () => {
    compressor['cctx'] = new mockBinding.CCtx();

    compressor.updateParameters({ compressionLevel: undefined });
    expect(mockBinding.CCtx.prototype.setParameter).not.toHaveBeenCalled();
  });
});

describe('CompressParameters', () => {
  test('matches binding.CParameter', () => {
    expectTypeOf<keyof CompressParameters>().toEqualTypeOf<
      keyof typeof binding.CParameter
    >();
  });
});

describe('CompressStream', () => {
  let stream: CompressStream;
  let chunks: Buffer[];
  const dataHandler = jest.fn((chunk: Buffer) => chunks.push(chunk));
  const errorHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    chunks = [];
    stream = new CompressStream();
    stream.on('data', dataHandler);
    stream.on('error', errorHandler);
  });

  afterEach(() => {
    // TODO: Determine if this is supposed to be legal
    // eslint-disable-next-line jest/no-standalone-expect
    expect(errorHandler).not.toHaveBeenCalled();
  });

  test('basic functionality works', (done) => {
    stream.on('end', () => {
      expectDecompress(Buffer.concat(chunks), Buffer.from('hello'));
      return done();
    });

    stream.end('hello');
  });

  test('#endFrame ends the frame at the correct point', (done) => {
    stream.on('end', () => {
      const result = Buffer.concat(chunks);

      // Verify two frames were emitted
      const firstFrameLen = binding.findFrameCompressedSize(result);
      expect(firstFrameLen).toBeLessThan(result.length);
      const firstFrame = result.subarray(0, firstFrameLen);
      const lastFrame = result.subarray(firstFrameLen);
      const lastFrameLen = binding.findFrameCompressedSize(lastFrame);
      expect(lastFrameLen).toBe(lastFrame.length);

      // Verify frame boundary is in the correct place
      expectDecompress(firstFrame, Buffer.from('hello'));
      expectDecompress(lastFrame, Buffer.from('world'));

      return done();
    });

    stream.write('hello');
    stream.endFrame();
    stream.end('world');
  });

  test('#endFrame flushes', (done) => {
    stream.write('hello', () => {
      // Verify nothing is written until we call flush
      expect(chunks).toHaveLength(0);
      stream.endFrame(() => {
        expect(chunks).toHaveLength(1);
        const [result] = chunks;
        assert.ok(result);

        // Verify exactly one frame was emitted
        const frameLen = binding.findFrameCompressedSize(result);
        expect(frameLen).toBe(result.length);

        // Verify data decompresses correctly
        expectDecompress(result, Buffer.from('hello'));

        return done();
      });
    });
  });

  test('#flush flushes but does not end frame', (done) => {
    stream.on('end', () => {
      const result = Buffer.concat(chunks);

      // One more chunk should have been emitted to end the frame
      // It should be an empty block (3 bytes)
      expect(chunks).toHaveLength(2);
      expect(chunks[1]).toHaveLength(3);

      // Verify only one frame was emitted
      const frameLen = binding.findFrameCompressedSize(result);
      expect(frameLen).toBe(result.length);

      // Verify data decompresses correctly
      expectDecompress(result, Buffer.from('hello'));

      return done();
    });

    stream.write('hello', () => {
      // Verify nothing is written until we call flush
      expect(chunks).toHaveLength(0);
      stream.flush(() => {
        expect(chunks).toHaveLength(1);
        stream.end();
      });
    });
  });

  test('#_transform correctly propagates errors', (done) => {
    mockBinding.CCtx.prototype.compressStream2.mockImplementationOnce(() => {
      throw new Error('Simulated error');
    });
    stream['cctx'] = new mockBinding.CCtx();

    const writeCb = jest.fn();
    stream.off('error', errorHandler);
    stream.on('error', (err) => {
      expect(err).toMatchObject({ message: 'Simulated error' });
      expect(writeCb).toHaveBeenCalledWith(err);
      return done();
    });
    stream.write('', writeCb);
  });

  test('#_flush correctly propagates errors', (done) => {
    mockBinding.CCtx.prototype.compressStream2.mockImplementationOnce(() => {
      throw new Error('Simulated error');
    });
    stream['cctx'] = new mockBinding.CCtx();

    stream.off('error', errorHandler);
    stream.on('error', (err) => {
      expect(err).toMatchObject(new Error('Simulated error'));
      return done();
    });

    stream.end();
  });

  test('handles input larger than buffer size', (done) => {
    // Generate incompressible input that's larger than the buffer
    const input = randomBytes(binding.cStreamInSize() * 2 + 1);

    stream.on('end', () => {
      // Verify data decompresses correctly
      expectDecompress(Buffer.concat(chunks), input);
      return done();
    });

    stream.write(input, () => {
      // Verify we actually got two blocks out of one write
      expect(chunks).toHaveLength(2);
      stream.end();
    });
  });
});

describe('compress', () => {
  test('basic functionality works', () => {
    const input = Buffer.from('hello');
    expectDecompress(compress(input), input);
  });
});

/* eslint jest/no-test-callback: 0 */
import { randomBytes } from 'crypto';
import * as binding from '../binding';
import { CompressStream } from '../lib';

const mockBinding: jest.Mocked<typeof binding> = jest.genMockFromModule(
  '../binding',
);

// TODO: Use HL API
function expectDecompress(input: Buffer, expected: Buffer): void {
  const output = Buffer.alloc(expected.length);
  const len = binding.decompress(output, input);
  expect(output.slice(0, len).equals(expected)).toBe(true);
}

describe('CompressStream', () => {
  let stream: CompressStream;
  let chunks: Buffer[];
  const dataHandler = jest.fn(chunk => chunks.push(chunk));
  const errorHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    chunks = [];
    stream = new CompressStream();
    stream.on('data', dataHandler);
    stream.on('error', errorHandler);
  });

  afterEach(() => {
    expect(errorHandler).not.toHaveBeenCalled();
  });

  test('basic functionality works', done => {
    stream.on('end', () => {
      expectDecompress(Buffer.concat(chunks), Buffer.from('hello'));
      return done();
    });

    stream.end('hello');
  });

  test('#endFrame ends the frame at the correct point', done => {
    stream.on('end', () => {
      const result = Buffer.concat(chunks);

      // Verify two frames were emitted
      const firstFrameLen = binding.findFrameCompressedSize(result);
      expect(firstFrameLen).toBeLessThan(result.length);
      const firstFrame = result.slice(0, firstFrameLen);
      const lastFrame = result.slice(firstFrameLen);
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

  test('#endFrame flushes', done => {
    stream.write('hello', () => {
      // Verify nothing is written until we call flush
      expect(chunks).toHaveLength(0);
      stream.endFrame(() => {
        expect(chunks).toHaveLength(1);
        const [result] = chunks;

        // Verify exactly one frame was emitted
        const frameLen = binding.findFrameCompressedSize(result);
        expect(frameLen).toBe(result.length);

        // Verify data decompresses correctly
        expectDecompress(result, Buffer.from('hello'));

        return done();
      });
    });
  });

  test('#flush flushes but does not end frame', done => {
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

  test('#_transform correctly propagates errors', done => {
    mockBinding.CCtx.prototype.compressStream2.mockImplementationOnce(() => {
      throw new Error('Simulated error');
    });
    stream['cctx'] = new mockBinding.CCtx();

    stream.write('', err => {
      expect(err).toMatchObject({ message: 'Simulated error' });
      return done();
    });
  });

  test('#_flush correctly propagates errors', done => {
    mockBinding.CCtx.prototype.compressStream2.mockImplementationOnce(() => {
      throw new Error('Simulated error');
    });
    stream['cctx'] = new mockBinding.CCtx();

    stream.off('error', errorHandler);
    stream.on('error', err => {
      expect(err).toMatchObject(new Error('Simulated error'));
      return done();
    });

    stream.end();
  });

  test('handles input larger than buffer size', done => {
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

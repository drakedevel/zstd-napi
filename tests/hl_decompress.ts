import { randomBytes } from 'crypto';
import * as binding from '../binding';
import { Compressor, CompressParameters, Decompressor } from '../lib';

const mockBinding: jest.Mocked<typeof binding> = jest.genMockFromModule(
  '../binding',
);

function compress(
  input: Uint8Array,
  params: Partial<CompressParameters> = {},
): Buffer {
  const compressor = new Compressor();
  compressor.setParameters(params);
  return compressor.compress(input);
}

describe('Decompressor', () => {
  let decompressor: Decompressor;

  beforeEach(() => {
    jest.clearAllMocks();
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
    decompressor['dctx'] = new mockBinding.DCtx();

    const dictBuf = Buffer.alloc(0);
    decompressor.loadDictionary(dictBuf);
    expect(mockBinding.DCtx.prototype.loadDictionary).toHaveBeenCalledWith(
      dictBuf,
    );
  });

  test('#setParameters resets other parameters', () => {
    decompressor['dctx'] = new mockBinding.DCtx();

    decompressor.setParameters({ windowLogMax: 10 });
    expect(mockBinding.DCtx.prototype.reset).toHaveBeenCalledWith(
      binding.ResetDirective.parameters,
    );
    expect(mockBinding.DCtx.prototype.setParameter).toHaveBeenCalledWith(
      binding.CParameter.compressionLevel,
      10,
    );
  });

  test('#updateParameters does not reset parameters', () => {
    decompressor['dctx'] = new mockBinding.DCtx();

    decompressor.updateParameters({ windowLogMax: 0 });
    expect(mockBinding.DCtx.prototype.reset).not.toHaveBeenCalled();
    expect(mockBinding.DCtx.prototype.setParameter).toHaveBeenCalled();
  });

  test('#updateParameters rejects invalid parameter names', () => {
    decompressor['dctx'] = new mockBinding.DCtx();

    expect(() => {
      decompressor.updateParameters({ invalidName: 42 } as object);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid parameter name: invalidName"`,
    );
    expect(mockBinding.DCtx.prototype.setParameter).not.toHaveBeenCalled();
  });

  test('#updateParameters ignores undefined values', () => {
    decompressor['dctx'] = new mockBinding.DCtx();

    decompressor.updateParameters({ windowLogMax: undefined });
    expect(mockBinding.DCtx.prototype.setParameter).not.toHaveBeenCalled();
  });
});

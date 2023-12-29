import { strict as assert } from 'assert';
import { Transform, TransformCallback } from 'stream';

import binding from '../binding';
import { ParamObject, mapNumber, mapParameters, tsAssert } from './util';

const PARAM_MAPPERS = {
  windowLogMax: mapNumber,
};

export type DecompressParameters = ParamObject<typeof PARAM_MAPPERS>;

function updateDCtxParameters(
  dctx: binding.DCtx,
  parameters: Partial<DecompressParameters>,
): void {
  const mapped = mapParameters(binding.DParameter, PARAM_MAPPERS, parameters);
  for (const [param, value] of mapped) {
    dctx.setParameter(param, value);
  }
}

function getTotalContentSize(buffer: Uint8Array): number | null {
  let result = 0;
  let frame = buffer;
  while (frame.length > 0) {
    const contentSize = binding.getFrameContentSize(frame);
    if (contentSize === null) return null;
    result += contentSize;
    frame = frame.subarray(binding.findFrameCompressedSize(frame));
  }
  return result;
}

const BUF_SIZE = binding.dStreamOutSize();

export class Decompressor {
  private dctx = new binding.DCtx();

  decompress(buffer: Uint8Array): Buffer {
    // TODO: Default allocation limit, with option to override
    // TODO: Add a way to supply a known size or size hint

    // Find total uncompressed size of all frames in buffer
    const contentSize = getTotalContentSize(buffer);

    // Fast path if we have a content size
    if (contentSize !== null) {
      const result = Buffer.allocUnsafe(contentSize);
      const decompressedSize = this.dctx.decompress(result, buffer);
      assert.equal(decompressedSize, contentSize);
      return result;
    }

    // Fall back to streaming decompression
    const resultChunks: Buffer[] = [];
    let remainingInput = buffer;
    while (remainingInput.length > 0) {
      // With the complete input available, decompressStream will gladly fill
      // an arbitrarily large buffer. We can exploit this to save native calls
      // by using the input size as a heuristic lower bound on the content size.
      //
      // This is conservative: it won't over-allocate memory by more than the
      // max of the input length and BUF_SIZE. It doesn't perform well in the
      // face of extremely high compression ratios, but the worst case is
      // equivalent to always allocating BUF_SIZE.
      const chunkLen = Math.max(BUF_SIZE, remainingInput.length);
      const chunk = Buffer.allocUnsafe(chunkLen);
      const [, produced, consumed] = this.dctx.decompressStream(
        chunk,
        remainingInput,
      );
      resultChunks.push(chunk.slice(0, produced));
      remainingInput = remainingInput.subarray(consumed);
    }

    // Concatenate the decompressed chunks (copies everything)
    return Buffer.concat(resultChunks);
  }

  loadDictionary(data: Buffer): void {
    this.dctx.loadDictionary(data);
  }

  setParameters(parameters: Partial<DecompressParameters>): void {
    this.dctx.reset(binding.ResetDirective.parameters);
    this.updateParameters(parameters);
  }

  updateParameters(parameters: Partial<DecompressParameters>): void {
    updateDCtxParameters(this.dctx, parameters);
  }
}

export class DecompressStream extends Transform {
  private dctx = new binding.DCtx();
  private inFrame = false;

  // TODO: Allow user to specify a dictionary
  constructor(parameters: Partial<DecompressParameters> = {}) {
    // TODO: autoDestroy doesn't really work on Transform, we should consider
    // calling .destroy ourselves when necessary.
    super({ autoDestroy: true });
    updateDCtxParameters(this.dctx, parameters);
  }

  override _transform(
    chunk: unknown,
    _encoding: string,
    done: TransformCallback,
  ): void {
    // TODO: Optimize this by looking at the frame header
    try {
      // The Writable machinery is responsible for converting to a Buffer
      tsAssert(chunk instanceof Buffer);
      let srcBuf = chunk;

      for (;;) {
        const dstBuf = Buffer.allocUnsafe(BUF_SIZE);
        const [ret, produced, consumed] = this.dctx.decompressStream(
          dstBuf,
          srcBuf,
        );
        if (produced > 0) this.push(dstBuf.slice(0, produced));

        srcBuf = srcBuf.slice(consumed);
        if (srcBuf.length === 0 && (produced < dstBuf.length || ret === 0)) {
          this.inFrame = ret !== 0;
          break;
        }
      }
    } catch (err) {
      done(err as Error);
      return;
    }
    done();
    return;
  }

  override _flush(done: TransformCallback): void {
    if (this.inFrame) {
      done(new Error('Stream ended in middle of compressed data frame'));
      return;
    }
    done();
    return;
  }
}

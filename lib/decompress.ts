import { strict as assert } from 'assert';
import { Transform, TransformCallback } from 'stream';

import * as binding from '../binding';
import { mapNumber, mapParameters } from './util';

/**
 * Zstandard decompression parameters.
 *
 * Most applications will not need to adjust these. See the
 * {@link https://facebook.github.io/zstd/zstd_manual.html | Zstandard manual}
 * for a full description.
 */
export interface DecompressParameters {
  windowLogMax?: number | undefined;
}

const PARAM_MAPPERS = {
  windowLogMax: mapNumber,
};

function updateDCtxParameters(
  dctx: binding.DCtx,
  parameters: DecompressParameters,
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

/**
 * High-level interface for customized single-pass Zstandard decompression.
 *
 * @example Basic usage
 * ```
 * const dec = new Decompressor();
 * const result = dec.decompress(compressedBuffer);
 * ```
 *
 * @example Advanced usage
 * ```
 * const dec = new Decompressor();
 * dec.setParameters({windowLogMax: 24});
 * dec.loadDictionary(fs.readFileSync('path/to/dictionary.dct'));
 * const result = dec.decompress(compressedBuffer);
 * ```
 */
export class Decompressor {
  private dctx = new binding.DCtx();

  /**
   * Decompress the data in `buffer` with the configured dictionary/parameters.
   *
   * @param buffer - Compressed data
   * @returns A new buffer with the uncompressed data
   */
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
      resultChunks.push(chunk.subarray(0, produced));
      remainingInput = remainingInput.subarray(consumed);
    }

    // Concatenate the decompressed chunks (copies everything)
    return Buffer.concat(resultChunks);
  }

  /**
   * Load a compression dictionary from the provided buffer.
   *
   * The loaded dictionary will be used for all future {@link decompress} calls
   * until removed or replaced. Passing an empty buffer to this function will
   * remove a previously loaded dictionary.
   */
  loadDictionary(data: Buffer): void {
    this.dctx.loadDictionary(data);
  }

  /**
   * Reset the decompressor state to only the provided parameters.
   *
   * Any loaded dictionary will be cleared, and any parameters not specified
   * will be reset to their default values.
   */
  setParameters(parameters: DecompressParameters): void {
    this.dctx.reset(binding.ResetDirective.parameters);
    this.updateParameters(parameters);
  }

  /**
   * Modify decompression parameters.
   *
   * Parameters not specified will be left at their current values.
   */
  updateParameters(parameters: DecompressParameters): void {
    updateDCtxParameters(this.dctx, parameters);
  }
}

/**
 * High-level interface for streaming Zstandard decompression.
 *
 * Implements the standard Node stream transformer interface, so can be used
 * with `.pipe` or any other streaming interface.
 *
 * @example Basic usage
 * ```
 * import { pipeline } from 'stream/promises';
 * await pipeline(
 *   fs.createReadStream('data.txt.zst'),
 *   new DecompressStream(),
 *   fs.createWriteStream('data.txt'),
 * );
 * ```
 */
export class DecompressStream extends Transform {
  private dctx = new binding.DCtx();
  private inFrame = false;

  // TODO: Allow user to specify a dictionary
  /**
   * Create a new streaming decompressor with the specified parameters.
   *
   * @param parameters - Decompression parameters
   */
  constructor(parameters: DecompressParameters = {}) {
    // TODO: autoDestroy doesn't really work on Transform, we should consider
    // calling .destroy ourselves when necessary.
    super({ autoDestroy: true });
    updateDCtxParameters(this.dctx, parameters);
  }

  /** @internal */
  override _transform(
    chunk: unknown,
    _encoding: string,
    done: TransformCallback,
  ): void {
    // TODO: Optimize this by looking at the frame header
    try {
      // The Writable machinery is responsible for converting to a Buffer
      assert(chunk instanceof Buffer);
      let srcBuf = chunk;

      for (;;) {
        const dstBuf = Buffer.allocUnsafe(BUF_SIZE);
        const [ret, produced, consumed] = this.dctx.decompressStream(
          dstBuf,
          srcBuf,
        );
        if (produced > 0) this.push(dstBuf.subarray(0, produced));

        srcBuf = srcBuf.subarray(consumed);
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

  /** @internal */
  override _flush(done: TransformCallback): void {
    if (this.inFrame) {
      done(new Error('Stream ended in middle of compressed data frame'));
      return;
    }
    done();
    return;
  }
}

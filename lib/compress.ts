import { strict as assert } from 'assert';
import { Transform, TransformCallback } from 'stream';

import * as binding from '../binding';
import { mapBoolean, mapEnum, mapNumber, mapParameters } from './util';

/**
 * Zstandard compression parameters.
 *
 * Most applications will only need the {@link compressionLevel} parameter. See
 * the {@link https://facebook.github.io/zstd/zstd_manual.html | Zstandard manual}
 * for a full description.
 */
export interface CompressParameters {
  /**
   * Compression level, where higher numbers compress better but are slower.
   *
   * Typical values range from 1 to 9, with a default of 3, but values up to 22
   * are allowed, as are negative values (see {@link binding.minCLevel}). Zero
   * is interpreted as "use the default".
   *
   * @category Basic parameters
   */
  compressionLevel?: number | undefined;

  // Advanced compression options
  /** @category Advanced compression options */
  windowLog?: number | undefined;
  /** @category Advanced compression options */
  hashLog?: number | undefined;
  /** @category Advanced compression options */
  chainLog?: number | undefined;
  /** @category Advanced compression options */
  searchLog?: number | undefined;
  /** @category Advanced compression options */
  minMatch?: number | undefined;
  /** @category Advanced compression options */
  targetLength?: number | undefined;
  /** @category Advanced compression options */
  strategy?: keyof typeof binding.Strategy | undefined;

  // Long-distance matching options
  /** @category Long-distance matching */
  enableLongDistanceMatching?: boolean | undefined;
  /** @category Long-distance matching */
  ldmHashLog?: number | undefined;
  /** @category Long-distance matching */
  ldmMinMatch?: number | undefined;
  /** @category Long-distance matching */
  ldmBucketSizeLog?: number | undefined;
  /** @category Long-distance matching */
  ldmHashRateLog?: number | undefined;

  // Frame parameters
  /** @category Frame parameters */
  contentSizeFlag?: boolean | undefined;
  /** @category Frame parameters */
  checksumFlag?: boolean | undefined;
  /** @category Frame parameters */
  dictIDFlag?: boolean | undefined;

  // Multi-threading parameters
  /** @category Multi-threading parameters */
  nbWorkers?: number | undefined;
  /** @category Multi-threading parameters */
  jobSize?: number | undefined;
  /** @category Multi-threading parameters */
  overlapLog?: number | undefined;
}

const PARAM_MAPPERS = {
  compressionLevel: mapNumber,

  // Advanced compression options
  windowLog: mapNumber,
  hashLog: mapNumber,
  chainLog: mapNumber,
  searchLog: mapNumber,
  minMatch: mapNumber,
  targetLength: mapNumber,
  strategy: mapEnum(binding.Strategy),

  // Long-distance matching options
  enableLongDistanceMatching: mapBoolean,
  ldmHashLog: mapNumber,
  ldmMinMatch: mapNumber,
  ldmBucketSizeLog: mapNumber,
  ldmHashRateLog: mapNumber,

  // Frame parameters
  contentSizeFlag: mapBoolean,
  checksumFlag: mapBoolean,
  dictIDFlag: mapBoolean,

  // Multi-threading parameters
  nbWorkers: mapNumber,
  jobSize: mapNumber,
  overlapLog: mapNumber,
};

function updateCCtxParameters(
  cctx: binding.CCtx,
  parameters: CompressParameters,
): void {
  const mapped = mapParameters(binding.CParameter, PARAM_MAPPERS, parameters);
  for (const [param, value] of mapped) {
    cctx.setParameter(param, value);
  }
}

/**
 * High-level interface for customized single-pass Zstandard compression.
 *
 * @example Basic usage
 * ```
 * const cmp = new Compressor();
 * const result = cmp.compress(Buffer.from('your data here'));
 * ```
 *
 * @example Advanced usage
 * ```
 * const cmp = new Compressor();
 * cmp.setParameters({compressionLevel: 9});
 * cmp.loadDictionary(fs.readFileSync('path/to/dictionary.dct'));
 * const result = cmp.compress(Buffer.from('your data here'));
 * ```
 */
export class Compressor {
  private cctx = new binding.CCtx();
  private scratchBuf: Buffer | null = null;
  private scratchLen = -1;

  /**
   * Compress the data in `buffer` with the configured dictionary/parameters.
   *
   * @param buffer - Data to compress
   * @returns A new Buffer containing the compressed data
   */
  compress(buffer: Uint8Array): Buffer {
    let dest: Buffer;
    if (this.scratchBuf && buffer.length <= this.scratchLen) {
      dest = this.scratchBuf;
    } else {
      dest = Buffer.allocUnsafe(binding.compressBound(buffer.length));
    }

    const length = this.cctx.compress2(dest, buffer);
    let result;
    if (length < 0.75 * dest.length) {
      // Destination buffer is too wasteful, trim by copying
      result = Buffer.from(dest.subarray(0, length));

      // Save the old buffer for scratch if it's small enough
      if (dest.length <= 128 * 1024 && buffer.length > this.scratchLen) {
        this.scratchBuf = dest;
        this.scratchLen = buffer.length;
      }
    } else {
      // Destination buffer is about the right size, return it directly
      result = dest.subarray(0, length);

      // Make sure we don't re-use the scratch buffer if we're returning it
      if (Object.is(dest, this.scratchBuf)) {
        this.scratchBuf = null;
        this.scratchLen = -1;
      }
    }
    return result;
  }

  /**
   * Load a compression dictionary from the provided buffer.
   *
   * The loaded dictionary will be used for all future {@link compress} calls
   * until removed or replaced. Passing an empty buffer to this function will
   * remove a previously loaded dictionary.
   *
   * Set any parameters you want to set before loading a dictionary, since
   * parameters can't be changed while a dictionary is loaded.
   */
  loadDictionary(data: Uint8Array): void {
    // TODO: Compression parameters get locked in on next compress operation,
    // and are cleared by setParameters. There should be some checks to ensure
    // users have a safe usage pattern.
    this.cctx.loadDictionary(data);
  }

  /**
   * Reset the compressor state to only the provided parameters.
   *
   * Any loaded dictionary will be cleared, and any parameters not specified
   * will be reset to their default values.
   */
  setParameters(parameters: CompressParameters): void {
    this.cctx.reset(binding.ResetDirective.parameters);
    this.updateParameters(parameters);
  }

  /**
   * Modify compression parameters.
   *
   * Parameters not specified will be left at their current values. Changing
   * parameters is not possible while a dictionary is loaded.
   */
  updateParameters(parameters: CompressParameters): void {
    updateCCtxParameters(this.cctx, parameters);
  }
}

const BUF_SIZE = binding.cStreamOutSize();

const dummyFlushBuffer = Buffer.alloc(0);
const dummyEndBuffer = Buffer.alloc(0);

/**
 * High-level interface for streaming Zstandard compression.
 *
 * Implements the standard Node stream transformer interface, so can be used
 * with `.pipe` or any other streaming interface.
 *
 * @example Basic usage
 * ```
 * import { pipeline } from 'stream/promises';
 * const cmp = new CompressStream();
 * await pipeline(
 *   fs.createReadStream('data.txt'),
 *   new CompressStream(),
 *   fs.createWriteStream('data.txt.zst'),
 * );
 * ```
 */
export class CompressStream extends Transform {
  private cctx = new binding.CCtx();
  private buffer = Buffer.allocUnsafe(BUF_SIZE);

  // TODO: Allow user to specify a dictionary
  /**
   * Create a new streaming compressor with the specified parameters.
   *
   * @param parameters - Compression parameters
   */
  constructor(parameters: CompressParameters = {}) {
    // TODO: autoDestroy doesn't really work on Transform, we should consider
    // calling .destroy ourselves when necessary.
    super({ autoDestroy: true });
    updateCCtxParameters(this.cctx, parameters);
  }

  // TODO: Provide API to allow changing parameters mid-frame in MT mode
  // TODO: Provide API to allow changing parameters between frames

  /**
   * End the current Zstandard frame without ending the stream.
   *
   * Frames are compressed independently, so this can be used to create a
   * "seekable" archive, or to provide more resilience to data corruption by
   * isolating parts of the file from each other.
   *
   * The optional `callback` is invoked with the same semantics as it is for a
   * a stream write.
   */
  endFrame(callback?: (error?: Error | null) => void): void {
    this.write(dummyEndBuffer, undefined, callback);
  }

  /**
   * Flush internal compression buffers to the stream.
   *
   * Ensures that a receiver can decompress all bytes written so far without
   * as much negative impact to compression as {@link endFrame}.
   *
   * The optional `callback` is invoked with the same semantics as it is for a
   * a stream write.
   */
  flush(callback?: (error?: Error | null) => void): void {
    this.write(dummyFlushBuffer, undefined, callback);
  }

  private doCompress(chunk: Buffer, endType: binding.EndDirective): void {
    const flushing = endType !== binding.EndDirective.continue;
    for (;;) {
      const [ret, produced, consumed] = this.cctx.compressStream2(
        this.buffer,
        chunk,
        endType,
      );
      if (produced > 0) {
        this.push(this.buffer.subarray(0, produced));
        this.buffer = Buffer.allocUnsafe(Math.max(BUF_SIZE, ret));
      }
      chunk = chunk.subarray(consumed);
      if (chunk.length == 0 && (!flushing || ret == 0)) return;
    }
  }

  /** @internal */
  override _transform(
    chunk: unknown,
    _encoding: string,
    done: TransformCallback,
  ): void {
    try {
      // The Writable machinery is responsible for converting to a Buffer
      assert(chunk instanceof Buffer);

      // Handle flushes indicated by special dummy buffers
      let endType = binding.EndDirective.continue;
      if (Object.is(chunk, dummyFlushBuffer))
        endType = binding.EndDirective.flush;
      else if (Object.is(chunk, dummyEndBuffer))
        endType = binding.EndDirective.end;

      this.doCompress(chunk, endType);
    } catch (err) {
      done(err as Error);
      return;
    }
    done();
    return;
  }

  /** @internal */
  override _flush(done: TransformCallback): void {
    try {
      this.doCompress(dummyEndBuffer, binding.EndDirective.end);
    } catch (err) {
      done(err as Error);
      return;
    }
    done();
    return;
  }
}

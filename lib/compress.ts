import { Transform, TransformCallback } from 'stream';

import binding from '../binding';
import {
  ParamObject,
  mapBoolean,
  mapEnum,
  mapNumber,
  mapParameters,
  tsAssert,
} from './util';

export type StrategyName = keyof typeof binding.Strategy;

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

export type CompressParameters = ParamObject<typeof PARAM_MAPPERS>;

function updateCCtxParameters(
  cctx: binding.CCtx,
  parameters: Partial<CompressParameters>,
): void {
  const mapped = mapParameters(binding.CParameter, PARAM_MAPPERS, parameters);
  for (const [param, value] of mapped) {
    cctx.setParameter(param, value);
  }
}

export class Compressor {
  private cctx = new binding.CCtx();
  private scratchBuf: Buffer | null = null;
  private scratchLen = -1;

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

  loadDictionary(data: Buffer): void {
    // TODO: Compression parameters get locked in on next compress operation,
    // and are cleared by setParameters. There should be some checks to ensure
    // users have a safe usage pattern.
    this.cctx.loadDictionary(data);
  }

  setParameters(parameters: Partial<CompressParameters>): void {
    this.cctx.reset(binding.ResetDirective.parameters);
    this.updateParameters(parameters);
  }

  updateParameters(parameters: Partial<CompressParameters>): void {
    updateCCtxParameters(this.cctx, parameters);
  }
}

const BUF_SIZE = binding.cStreamOutSize();

const dummyFlushBuffer = Buffer.alloc(0);
const dummyEndBuffer = Buffer.alloc(0);

export class CompressStream extends Transform {
  private cctx = new binding.CCtx();
  private buffer = Buffer.allocUnsafe(BUF_SIZE);

  // TODO: Allow user to specify a dictionary
  constructor(parameters: Partial<CompressParameters> = {}) {
    // TODO: autoDestroy doesn't really work on Transform, we should consider
    // calling .destroy ourselves when necessary.
    super({ autoDestroy: true });
    updateCCtxParameters(this.cctx, parameters);
  }

  // TODO: Provide API to allow changing parameters mid-frame in MT mode
  // TODO: Provide API to allow changing parameters between frames

  endFrame(callback?: (error?: Error | null) => void): void {
    this.write(dummyEndBuffer, undefined, callback);
  }

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

  override _transform(
    chunk: unknown,
    _encoding: string,
    done: TransformCallback,
  ): void {
    try {
      // The Writable machinery is responsible for converting to a Buffer
      tsAssert(chunk instanceof Buffer);

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

import { Transform, TransformCallback } from 'stream';

import * as binding from '../binding';

export type StrategyName = keyof typeof binding.Strategy;

export interface CompressParameters {
  compressionLevel: number;

  // Advanced compression options
  windowLog: number;
  hashLog: number;
  chainLog: number;
  searchLog: number;
  minMatch: number;
  targetLength: number;
  strategy: StrategyName;

  // Long-distance matching options
  enableLongDistanceMatching: boolean;
  ldmHashLog: number;
  ldmMinMatch: number;
  ldmBucketSizeLog: number;
  ldmHashRateLog: number;

  // Frame parameters
  contentSizeFlag: boolean;
  checksumFlag: boolean;
  dictIDFlag: boolean;

  // Multi-threading parameters
  nbWorkers: number;
  jobSize: number;
  overlapLog: number;
}

type CompressParameterName = keyof CompressParameters;

function assertInvalidParameter(parameter: never): never {
  throw new RangeError(`Invalid parameter name: ${parameter}`);
}

function updateCCtxParameters(
  cctx: binding.CCtx,
  parameters: Partial<CompressParameters>,
): void {
  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined) continue;
    const name = key as CompressParameterName;
    let mapped: number;
    switch (name) {
      case 'compressionLevel':
      case 'windowLog':
      case 'hashLog':
      case 'chainLog':
      case 'searchLog':
      case 'minMatch':
      case 'targetLength':
      case 'ldmHashLog':
      case 'ldmMinMatch':
      case 'ldmBucketSizeLog':
      case 'ldmHashRateLog':
      case 'nbWorkers':
      case 'jobSize':
      case 'overlapLog':
        mapped = parameters[name]!;
        break;

      case 'enableLongDistanceMatching':
      case 'contentSizeFlag':
      case 'checksumFlag':
      case 'dictIDFlag':
        mapped = Number(parameters[name]!);
        break;

      case 'strategy':
        mapped = binding.Strategy[parameters[name]!];
        break;

      default:
        assertInvalidParameter(name);
    }
    cctx.setParameter(binding.CParameter[name], mapped);
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
      result = Buffer.from(dest.slice(0, length));

      // Save the old buffer for scratch if it's small enough
      if (dest.length <= 128 * 1024 && buffer.length > this.scratchLen) {
        this.scratchBuf = dest;
        this.scratchLen = buffer.length;
      }
    } else {
      // Destination buffer is about the right size, return it directly
      result = dest.slice(0, length);

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
    super();
    updateCCtxParameters(this.cctx, parameters);
  }

  // TODO: Provide API to allow changing parameters mid-frame in MT mode
  // TODO: Provide API to allow changing parameters between frames

  endFrame(callback?: (error?: Error | null) => void): void {
    this.write(dummyEndBuffer, '', callback);
  }

  flush(callback?: (error?: Error | null) => void): void {
    this.write(dummyFlushBuffer, '', callback);
  }

  private doCompress(chunkBuf: Buffer, endType: binding.EndDirective): void {
    const flushing = endType !== binding.EndDirective.continue;
    for (;;) {
      const [ret, produced, consumed] = this.cctx.compressStream2(
        this.buffer,
        chunkBuf,
        endType,
      );
      if (produced > 0) {
        this.push(this.buffer.slice(0, produced));
        this.buffer = Buffer.allocUnsafe(BUF_SIZE);
      }
      chunkBuf = chunkBuf.slice(consumed);
      if (chunkBuf.length == 0 && (!flushing || ret == 0)) return;
    }
  }

  _transform(chunk: unknown, encoding: string, done: TransformCallback): void {
    let chunkBuf: Buffer;
    if (typeof chunk === 'string')
      chunkBuf = Buffer.from(chunk, encoding as BufferEncoding);
    else if (chunk instanceof Buffer) chunkBuf = chunk;
    else throw new TypeError('Expected string or Buffer chunk');

    // Handle flushes indicated by special dummy buffers
    let endType = binding.EndDirective.continue;
    if (Object.is(chunkBuf, dummyFlushBuffer))
      endType = binding.EndDirective.flush;
    else if (Object.is(chunkBuf, dummyEndBuffer))
      endType = binding.EndDirective.end;

    this.doCompress(chunkBuf, endType);

    return done();
  }

  _flush(done: TransformCallback): void {
    this.doCompress(dummyEndBuffer, binding.EndDirective.end);
    return done();
  }
}

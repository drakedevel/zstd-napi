import { strict as assert } from 'assert';

import * as binding from '../binding';
import { assertInvalidParameter } from './util';

export interface DecompressParameters {
  windowLogMax: number;
}

type DecompressParameterName = keyof DecompressParameters;

function updateDCtxParameters(
  dctx: binding.DCtx,
  parameters: Partial<DecompressParameters>,
): void {
  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined) continue;
    const name = key as DecompressParameterName;
    let mapped: number;
    switch (name) {
      case 'windowLogMax':
        mapped = Number(parameters[name]!);
        break;

      default:
        assertInvalidParameter(name);
    }
    dctx.setParameter(binding.DParameter[name], mapped);
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

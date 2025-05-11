import { describe, expect } from '@jest/globals';
import { fc, it } from '@fast-check/jest';
import { strict as assert } from 'assert';
import events from 'events';

import {
  Compressor,
  CompressStream,
  Decompressor,
  DecompressStream,
} from '../lib/index.ts';

// Generate some deterministic random data up front to slice from. This is
// much faster than generating data directly with fast-check, and allows for
// some compression to actually happen.
const dataPool: Buffer = (() => {
  const arrLen = (1024 * 1024) / 4;
  const [arr] = fc.sample(
    fc.uint32Array({ minLength: arrLen, maxLength: arrLen }).noBias(),
    { numRuns: 1, seed: 0 },
  );
  assert(arr);
  return Buffer.from(arr.buffer);
})();

function arbSubarray(pool: Buffer) {
  return fc
    .nat(pool.length - 1)
    .noBias()
    .chain((start) =>
      fc
        .nat(pool.length - start)
        .map((length) => pool.subarray(start, start + length)),
    );
}

describe('single-pass API', () => {
  const arbData = fc.oneof(
    arbSubarray(dataPool),
    arbSubarray(dataPool).map((s) => Buffer.from(s.toString('base64'))),
  );
  const arbOpts = fc.oneof(
    fc.constant(undefined),
    fc.constant({ contentSizeFlag: false }),
  );

  it.prop([fc.array(fc.tuple(arbData, arbOpts))])('should roundtrip', (ops) => {
    // Run the ops through each of the compressor and decompressor. Delay
    // checking results as long as possible to allow bugs in buffer re-use
    // to be detected.
    const cmp = new Compressor();
    const dec = new Decompressor();
    const cmpResults = [];
    for (const [data, opts] of ops) {
      if (opts) {
        cmp.setParameters(opts);
      }
      cmpResults.push({ data, compressed: cmp.compress(data) });
    }
    const decResults = [];
    for (const { data, compressed } of cmpResults) {
      const decompressed = dec.decompress(compressed);
      decResults.push({ data, decompressed });
    }
    for (const { data, decompressed } of decResults) {
      expect(decompressed.equals(data)).toBe(true);
    }
  });
});

describe('streaming API', () => {
  // Generate a mixture of calls to the stream
  const arbOp = fc.oneof(
    {
      arbitrary: arbSubarray(dataPool).map((slice) => ({ write: slice })),
      weight: 10,
    },
    fc.constant({ flush: {} }),
    fc.constant({ endFrame: {} }),
  );

  it.prop([fc.array(arbOp, { maxLength: 25 })])(
    'should roundtrip',
    async (ops) => {
      // Run each operation on the pipeline
      const cmp = new CompressStream();
      const dec = new DecompressStream();
      const input: Buffer[] = [];
      const output: Buffer[] = [];
      cmp.pipe(dec);
      dec.on('data', (chunk: Buffer) => output.push(chunk));
      for (const op of ops) {
        if ('write' in op) {
          input.push(op.write);
          cmp.write(op.write);
        } else if ('flush' in op) {
          cmp.flush();
        } else if ('endFrame' in op) {
          cmp.endFrame();
        }
      }
      cmp.end();
      await events.once(dec, 'end');

      // Verify the output matches
      const actual = Buffer.concat(output);
      const expected = Buffer.concat(input);
      expect(actual.equals(expected)).toBe(true);
    },
  );
});

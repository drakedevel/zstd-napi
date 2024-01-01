/**
 * This module (imported as `zstd-napi`) provides a high-level interface for
 * Zstandard compression and decompression. If you aren't sure what you need,
 * this is the right place to start!
 *
 * - The {@link compress} and {@link decompress} functions are the simplest,
 *   single-pass (in-memory) interface.
 * - The {@link Compressor} and {@link Decompressor} classes provide a
 *   single-pass interface with dictionary support.
 * - The {@link CompressStream} and {@link DecompressStream} classes provide
 *   a streaming interface.
 *
 * If you're looking for low-level bindings to the native Zstandard library,
 * see the {@link "binding" | binding module}.
 *
 * @module index
 */

export { CompressStream, Compressor } from './compress';
export type { CompressParameters, StrategyName } from './compress';

export { DecompressStream, Decompressor } from './decompress';
export type { DecompressParameters } from './decompress';

export { compress, decompress } from './simple';

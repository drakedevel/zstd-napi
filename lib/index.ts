/**
 * This module (imported as `zstd-napi`) provides a high-level interface for
 * Zstandard compression and decompression. If you aren't sure what you need,
 * this is the right place to start!
 *
 * See {@link Compressor} and {@link Decompressor} for the single-pass
 * (in-memory) interface, or {@link CompressStream} and {@link DecompressStream}
 * for the streaming interface.
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

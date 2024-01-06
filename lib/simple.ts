import { Compressor, CompressParameters } from './compress';
import { Decompressor, DecompressParameters } from './decompress';

let defaultCompressor: Compressor | undefined;
let defaultDecompressor: Decompressor | undefined;

/**
 * Compress `data` with Zstandard.
 *
 * Under the hood, this uses a shared, lazily-initialized {@link Compressor},
 * which minimizes overhead. If you need dictionary support, create your own
 * instance of that class.
 *
 * @param data - Buffer containing data to compress
 * @param parameters - Optional compression parameters
 * @returns Compressed data
 */
export function compress(
  data: Uint8Array,
  parameters: CompressParameters = {},
) {
  if (!defaultCompressor) {
    defaultCompressor = new Compressor();
  }
  defaultCompressor.setParameters(parameters);
  return defaultCompressor.compress(data);
}

/**
 * Decompress Zstandard-compressed `data`.
 *
 * Under the hood, this uses a shared, lazily-initialized {@link Decompressor},
 * which minimizes overhead. If you need dictionary support, create your own
 * instance of that class.
 *
 * @param data - Buffer containing compressed data
 * @param parameters - Optional decompression parameters
 * @returns Decompressed data
 */
export function decompress(
  data: Uint8Array,
  parameters: DecompressParameters = {},
) {
  if (!defaultDecompressor) {
    defaultDecompressor = new Decompressor();
  }
  defaultDecompressor.setParameters(parameters);
  return defaultDecompressor.decompress(data);
}

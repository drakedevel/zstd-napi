/**
 * This module (imported as `zstd-napi/binding`) exposes a thin (but safe!)
 * wrapper around the native Zstandard API. If you aren't trying to do something
 * weird, use the {@link "index" | high-level API} instead.
 *
 * Native API functions that are associated with a data structure are methods on
 * the wrapper class corresponding to that data structure. For example, many
 * compression functions take a `ZSTD_CCtx` and can therefore be found on the
 * {@link CCtx} class.
 *
 * The upstream
 * {@link https://facebook.github.io/zstd/zstd_manual.html | Zstandard manual}
 * is the best source for understanding how to use this API. While this
 * documentation tries to be helpful, it has only a small fraction of the
 * information. Documentation for structures and functions within this module
 * will mention the corresponding native names to enable cross-referencing.
 * (Alas, it appears not to be possible to _link_ to functions on that page...)
 *
 * @module
 */

/**
 * Magic number denoting the start of a Zstandard frame.
 *
 * Corresponds to `ZSTD_MAGICNUMBER`.
 */
export const MAGICNUMBER: number;

/**
 * Magic number denoting the start of a Zstandard dictionary.
 *
 * Corresponds to `ZSTD_MAGIC_DICTIONARY`.
 */
export const MAGIC_DICTIONARY: number;

/**
 * Corresponds to `ZSTD_MAGIC_SKIPPABLE_START`.
 * @experimental
 */
export const MAGIC_SKIPPABLE_START: number;

/**
 * Corresponds to `ZSTD_MAGIC_SKIPPABLE_MASK`.
 * @experimental
 */
export const MAGIC_SKIPPABLE_MASK: number;

/**
 * Parameters for Zstandard compression.
 *
 * @category Advanced API
 */
export enum CParameter {
  compressionLevel,
  windowLog,
  hashLog,
  chainLog,
  searchLog,
  minMatch,
  targetLength,
  strategy,
  enableLongDistanceMatching,
  ldmHashLog,
  ldmMinMatch,
  ldmBucketSizeLog,
  ldmHashRateLog,
  contentSizeFlag,
  checksumFlag,
  dictIDFlag,
  nbWorkers,
  jobSize,
  overlapLog,
}

/**
 * Parameters for Zstandard decompression.
 *
 * Corresponds to `ZSTD_dParameter`.
 *
 * @category Advanced API
 */
export enum DParameter {
  windowLogMax,
}

/**
 * Identifies whether to flush or close the current frame.
 *
 * Corresponds to `ZSTD_EndDirective`.
 *
 * @category Streaming
 */
export enum EndDirective {
  /** Don't flush or end the frame */
  continue,
  /** Flush all data written so far */
  flush,
  /** Flush all data written so far and end the frame */
  end,
}

/**
 * Identifies what parts of a (de)compression context to reset.
 *
 * Corresponds to `ZSTD_ResetDirective`.
 *
 * @category Advanced API
 */
export enum ResetDirective {
  /** Abort the current frame, but keep dictionary/parameters */
  sessionOnly,
  /** Reset the dictionary/parameters (only works if not in a frame) */
  parameters,
  /** Reset both the frame and dictionary/parameters */
  sessionAndParameters,
}

/**
 * Compression strategies.
 *
 * Used as values for {@link CParameter.strategy}.
 *
 * Corresponds to `ZSTD_strategy`.
 *
 * @category Advanced API
 */
export enum Strategy {
  fast,
  dfast,
  greedy,
  lazy,
  lazy2,
  btlazy2,
  btopt,
  btultra,
}

/**
 * Composite return value for streaming (de)compression functions.
 *
 * These functions effectively return three values:
 * - `returnValue`: the function's normal return value
 * - `dstProduced`: the number of bytes written to the output buffer
 * - `srcProduced`: the number of bytes read from the input buffer
 *
 * @remarks
 * The latter two of these are out parameters in C, and the most efficient way
 * to map that to a JavaScript API is to return a composite value instead. We
 * use a tuple for performance reasons: Node-API (unlike V8) doesn't have an API
 * to efficiently construct objects with a fixed set of properties.
 *
 * @category Streaming
 */
type StreamResult = [
  returnValue: number,
  dstProduced: number,
  srcConsumed: number,
];

/**
 * Compression context.
 *
 * Wraps `ZSTD_CCtx` (which is also `ZSTD_CStream`). The finalizer automatically
 * calls `ZSTD_freeCCtx` when this object is garbage collected.
 */
export class CCtx {
  private __brand__: unique symbol;

  /**
   * Creates a new compression context.
   *
   * Wraps `ZSTD_createCCtx`.
   */
  constructor();

  /**
   * Compresses `srcBuf` into `dstBuf` at compression level `level`.
   *
   * `dstBuf` must be large enough to fit the entire result. See
   * {@link compressBound} for a way to compute an upper bound on that size.
   *
   * This ignores any parameters set by {@link setParameter} and compresses
   * at the level specified by `level`. See {@link compress2} for a similar
   * function that respects those parameters.
   *
   * Wraps `ZSTD_compressCCtx`.
   *
   * @param dstBuf - Output buffer for compressed bytes
   * @param srcBuf - Data to compress
   * @param level - Compression level
   * @returns Number of compressed bytes written to `dstBuf`
   */
  compress(dstBuf: Uint8Array, srcBuf: Uint8Array, level: number): number;

  /**
   * Compresses `srcBuf` into `dstBuf`, using `dictBuf` as a dictionary.
   *
   * Works like {@link CCtx.compress | compress}, except it uses a dictionary.
   *
   * Wraps `ZSTD_compress_usingDict`.
   *
   * @remarks
   * Loading the dictionary from a buffer is expensive. If the dictionary will
   * be used more than once, it's better to load it into a {@link CDict} once
   * and use {@link compressUsingCDict} instead.
   *
   * @param dstBuf - Output buffer for compressed bytes
   * @param srcBuf - Data to compress
   * @param dictBuf - Compression dictionary
   * @param level - Compression level
   * @returns Number of compressed bytes written to `dstBuf`
   */
  compressUsingDict(
    dstBuf: Uint8Array,
    srcBuf: Uint8Array,
    dictBuf: Uint8Array,
    level: number,
  ): number;

  /**
   * Compresses `srcBuf` into `dstBuf` using the prepared dictionary `dict`.
   *
   * Works like {@link CCtx.compress | compress}, except it uses a dictionary.
   * The compression level is selected at dictionary load time.
   *
   * Wraps `ZSTD_compress_usingCDict`.
   *
   * @param dstBuf - Output buffer for compressed bytes
   * @param srcBuf - Data to compress
   * @param dict - Prepared dictionary
   * @returns Number of compressed bytes written to `dstBuf`
   */
  compressUsingCDict(
    dstBuf: Uint8Array,
    srcBuf: Uint8Array,
    dict: CDict,
  ): number;

  /**
   * Set a compression parameter.
   *
   * Note that these parameters are only respected by the {@link compress2}
   * and {@link compressStream2} methods.
   *
   * Wraps `ZSTD_CCtx_setParameter`.
   *
   * @param param - Parameter to set
   * @param value - New parameter value
   */
  setParameter(param: CParameter, value: number): void;

  /**
   * Set the uncompressed length of the next frame.
   *
   * Allows populating the header with the uncompressed size when using the
   * streaming compression interface. Compression will throw an error if this
   * commitment is not respected.
   *
   * Wraps `ZSTD_CCtx_setPledgedSrcSize`.
   */
  setPledgedSrcSize(size: number): void;

  /**
   * Resets this compression context.
   *
   * The `reset` parameter controls what exactly is reset.
   *
   * Wraps `ZSTD_CCtx_reset`.
   */
  reset(reset: ResetDirective): void;

  /**
   * Compresses `srcBuf` into `dstBuf`.
   *
   * Works like {@link CCtx.compress | compress}, except it respects the
   * configuration set on this object with other methods.
   *
   * Wraps `ZSTD_compress2`.
   *
   * @param dstBuf - Output buffer for compressed bytes
   * @param srcBuf - Data to compress
   * @returns Number of compressed bytes written to `dstBuf`
   */
  compress2(dstBuf: Uint8Array, srcBuf: Uint8Array): number;

  /**
   * Compresses `srcBuf` into `dstBuf` with a streaming interface.
   *
   * The `endOp` parameter indicates whether to flush data or end the frame.
   *
   * May consume all or part of `srcBuf`, and may partially write `dstBuf`.
   * Returns a tuple with a bound on how many bytes are left to flush, how many
   * bytes were written, and how many bytes were consumed.
   *
   * Wraps `ZSTD_compressStream2`.
   *
   * @remarks
   * This function requires some care to use correctly, consult the {@link
   * https://facebook.github.io/zstd/zstd_manual.html | Zstandard manual} for
   * full usage information.
   *
   * @param dstBuf - Output buffer for compressed bytes
   * @param srcBuf - Data to compress
   * @param endOp - Whether to flush or end the frame
   * @returns Compression progress information
   */
  compressStream2(
    dstBuf: Uint8Array,
    srcBuf: Uint8Array,
    endOp: EndDirective,
  ): StreamResult;

  /**
   * Load a compression dictionary from `dictBuf`.
   *
   * Note that this dictionary will only be used by the {@link compress2} and
   * {@link compressStream2} methods.
   *
   * Wraps `ZSTD_CCtx_loadDictionary`.
   */
  loadDictionary(dictBuf: Uint8Array): void;
}

/**
 * Prepared dictionary for compression.
 *
 * Wraps `ZSTD_CDict`. The finalizer automatically calls `ZSTD_freeCDict` when
 * this object is garbage collected.
 *
 * @category Dictionary
 */
export class CDict {
  private __brand__: unique symbol;

  /**
   * Load a dictionary for compression from the bytes in `dictBuf`.
   *
   * The compression level must be given in `level` and will override any
   * compression level set when this dictionary is used.
   *
   * Wraps `ZSTD_createCDict`.
   */
  constructor(dictBuf: Uint8Array, level: number);
}

/**
 * Decompression context.
 *
 * Wraps `ZSTD_DCtx` (which is also `ZSTD_DStream`). The finalizer automatically
 * calls `ZSTD_freeDCtx` when this object is garbage collected.
 */
export class DCtx {
  private __brand__: unique symbol;

  /**
   * Creates a new decompression context.
   *
   * Wraps `ZSTD_createDCtx`.
   */
  constructor();

  /**
   * Decompresses `srcBuf` into `dstBuf`.
   *
   * `dstBuf` must be large enough to fit the entire result. `srcBuf` must end
   * on a frame boundary (no partial frames or other trailing data).
   *
   * Wraps `ZSTD_decompressDCtx`.
   *
   * @remarks
   * If the frame has the uncompressed size in the header, you can use
   * {@link getFrameContentSize} to determine how big the buffer needs to be.
   * If it's too large, or unknown, use {@link decompressStream} instead.
   *
   * @param dstBuf - Output buffer for decompressed bytes
   * @param srcBuf - Data to decompress
   * @returns Number of decompressed bytes written to `dstBuf`
   */
  decompress(dstBuf: Uint8Array, srcBuf: Uint8Array): number;

  /**
   * Decompresses `srcBuf` into `dstBuf` with a streaming interface.
   *
   * May consume all or part of `srcBuf`, and may partially write `dstBuf`.
   * Returns a tuple with a bound on how many bytes are left to flush, how many
   * bytes were written, and how many bytes were consumed.
   *
   * Wraps `ZSTD_decompressStream`.
   *
   * @remarks
   * This function requires some care to use correctly, consult the {@link
   * https://facebook.github.io/zstd/zstd_manual.html | Zstandard manual} for
   * full usage information.
   *
   * @param dstBuf - Output buffer for decompressed bytes
   * @param srcBuf - Data to decompress
   * @returns Decompression progress information
   */
  decompressStream(dstBuf: Uint8Array, srcBuf: Uint8Array): StreamResult;

  /**
   * Decompresses `srcBuf` into `dstBuf`, using `dictBuf` as a dictionary.
   *
   * Works like {@link DCtx.decompress | decompress}, except it uses the
   * provided dictionary instead of any set on this context.
   *
   * Wraps `ZSTD_decompress_usingDict`.
   *
   * @remarks
   * Loading the dictionary from a buffer is expensive. If the dictionary will
   * be used more than once, it's better to load it into a {@link DDict} once
   * and use {@link decompressUsingDDict} instead.
   *
   * @param dstBuf - Output buffer for decompressed bytes
   * @param srcBuf - Data to decompress
   * @param dictBuf - Compression dictionary
   * @returns Number of compressed bytes written to `dstBuf`
   */
  decompressUsingDict(
    dstBuf: Uint8Array,
    srcBuf: Uint8Array,
    dictBuf: Uint8Array,
  ): number;

  /**
   * Decompresses `srcBuf` into `dstBuf` using the prepared dictionary `dict`.
   *
   * Works like {@link DCtx.decompress | decompress}, except it uses the
   * provided dictionary instead of any set on this context.
   *
   * Wraps `ZSTD_decompress_usingDDict`.
   *
   * @param dstBuf - Output buffer for compressed bytes
   * @param srcBuf - Data to compress
   * @param dict - Prepared dictionary
   * @returns Number of compressed bytes written to `dstBuf`
   */
  decompressUsingDDict(
    dstBuf: Uint8Array,
    srcBuf: Uint8Array,
    dict: DDict,
  ): number;

  /**
   * Set a decompression parameter.
   *
   * Wraps `ZSTD_DCtx_setParameter`.
   *
   * @param param - Parameter to set
   * @param value - New parameter value
   */
  setParameter(param: DParameter, value: number): void;

  /**
   * Resets this decompression context.
   *
   * The `reset` parameter controls what exactly is reset.
   *
   * Wraps `ZSTD_DCtx_reset`.
   */
  reset(reset: ResetDirective): void;

  /**
   * Load a compression dictionary from `dictBuf`.
   *
   * This dictionary will be used by {@link DCtx.decompress | decompress} and
   * {@link decompressStream}.
   *
   * Wraps `ZSTD_DCtx_loadDictionary`.
   */
  loadDictionary(dictBuf: Uint8Array): void;
}

/**
 * Prepared dictionary for decompression.
 *
 * Wraps `ZSTD_DDict`. The finalizer automatically calls `ZSTD_freeDDict` when
 * this object is garbage collected.
 *
 * @category Dictionary
 */
export class DDict {
  private __brand__: unique symbol;

  /**
   * Load a dictionary for decompression from the bytes in `dictBuf`.
   *
   * Wraps `ZSTD_createDDict`.
   */
  constructor(dictBuf: Uint8Array);

  /**
   * Returns the ID for this dictionary.
   *
   * Wraps `ZSTD_getDictID_fromDDict`.
   *
   * @returns The ID, or 0 if this is a non-standard/content-only dictionary
   */
  getDictID(): number;
}

/**
 * Inclusive lower and upper bounds for a parameter.
 *
 * Corresponds to `ZSTD_bounds`.
 *
 * @category Advanced API
 */
export interface Bounds {
  /** Minimum allowed value */
  lowerBound: number;
  /** Maximum allowed value */
  upperBound: number;
}

/**
 * Returns the Zstandard library version as a number.
 *
 * Wraps `ZSTD_versionNumber`.
 */
export function versionNumber(): number;

/**
 * Returns the Zstandard library version as a string.
 *
 * Wraps `ZSTD_versionString`.
 */
export function versionString(): string;

/**
 * Compresses `srcBuf` into `dstBuf` at compression level `level`.
 *
 * `dstBuf` must be large enough to fit the entire result. See
 * {@link compressBound} for a way to compute an upper bound on that size.
 *
 * Wraps `ZSTD_compress`.
 *
 * @remarks
 * This function is here for completeness, creating a {@link CCtx} and reusing
 * it will give better performance than calling this repeatedly. The high-level
 * {@link index.compress | compress} function will take care of this for you.
 *
 * @param dstBuf - Output buffer for compressed bytes
 * @param srcBuf - Data to compress
 * @param level - Compression level
 * @returns Number of compressed bytes written to `dstBuf`
 * @category Simple API
 */
export function compress(
  dstBuf: Uint8Array,
  srcBuf: Uint8Array,
  level: number,
): number;

/**
 * Decompresses `srcBuf` into `dstBuf`.
 *
 * `dstBuf` must be large enough to fit the entire result. `srcBuf` must end on
 * a frame boundary (no partial frames or other trailing data).
 *
 * Wraps `ZSTD_decompress`.
 *
 * @remarks
 * This function is here for completeness, creating a {@link DCtx} and reusing
 * it will give better performance than calling this repeatedly. The high-level
 * {@link index.decompress | decompress} function will take care of this for
 * you.
 *
 * @param dstBuf - Output buffer for decompressed bytes
 * @param srcBuf - Data to decompress
 * @returns Number of decompressed bytes written to `dstBuf`
 * @category Simple API
 */
export function decompress(dstBuf: Uint8Array, srcBuf: Uint8Array): number;

/**
 * Returns the number of decompressed bytes in the provided frame.
 *
 * Wraps `ZSTD_getFrameContentSize`.
 *
 * @param frameBuf - Buffer with Zstandard frame (or frame header)
 * @returns Number of decompressed bytes, or `null` if unknown
 * @category Simple API
 */
export function getFrameContentSize(frameBuf: Uint8Array): number | null;

/**
 * Returns the size of the first compressed frame in `frameBuf`.
 *
 * @param frameBuf - Buffer containing at least one complete Zstandard frame
 * @returns Size of the first frame in `frameBuf`
 * @category Simple API
 */
export function findFrameCompressedSize(frameBuf: Uint8Array): number;

/**
 * Returns worst-case maximum compressed size for an input of `srcSize` bytes.
 *
 * @category Simple API
 */
export function compressBound(srcSize: number): number;

/**
 * Returns the minimum valid compression level.
 *
 * @category Simple API
 */
export function minCLevel(): number;

/**
 * Returns the maximum valid compression level.
 *
 * @category Simple API
 */
export function maxCLevel(): number;

/**
 * Get upper and lower bounds for a compression parameter.
 *
 * Wraps `ZSTD_cParam_getBounds`.
 *
 * @category Advanced API
 */
export function cParamGetBounds(param: CParameter): Bounds;

/**
 * Get upper and lower bounds for a decompression parameter.
 *
 * Wraps `ZSTD_dParam_getBounds`.
 *
 * @category Advanced API
 */
export function dParamGetBounds(param: DParameter): Bounds;

/**
 * Returns the recommended size of a streaming compression input buffer.
 *
 * Wraps `ZSTD_CStreamInSize`.
 *
 * @category Streaming
 */
export function cStreamInSize(): number;

/**
 * Returns the recommended size of a streaming compression output buffer.
 *
 * Wraps `ZSTD_CStreamOutSize`.
 *
 * @category Streaming
 */
export function cStreamOutSize(): number;

/**
 * Returns the recommended size of a streaming decompression input buffer.
 *
 * Wraps `ZSTD_DStreamInSize`.
 *
 * @category Streaming
 */
export function dStreamInSize(): number;

/**
 * Returns the recommended size of a streaming decompression input buffer.
 *
 * Wraps `ZSTD_DStreamOutSize`.
 *
 * @category Streaming
 */
export function dStreamOutSize(): number;

/**
 * Returns the dictionary ID stored in the provided dictionary.
 *
 * Wraps `ZSTD_getDictID_fromDict`.
 *
 * @param dictBuf - Buffer containing the dictionary
 * @returns The dictionary ID, or 0 if the buffer does not contain a dictionary
 * @category Dictionary
 */
export function getDictIDFromDict(dictBuf: Uint8Array): number;

/**
 * Returns the dictionary ID recorded in a Zstandard frame.
 *
 * @param frameBuf - Buffer containing a Zstandard frame
 * @returns The dictionary ID, or 0 if the frame header doesn't include one (or
 * if the buffer doesn't contain a valid frame header)
 * @category Dictionary
 */
export function getDictIDFromFrame(frameBuf: Uint8Array): number;

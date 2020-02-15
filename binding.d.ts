export const MAGICNUMBER: number;
export const MAGIC_DICTIONARY: number;
export const MAGIC_SKIPPABLE_START: number;
export const MAGIC_SKIPPABLE_MASK: number;

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

export enum DParameter {
  windowLogMax,
}

export enum EndDirective {
  continue,
  flush,
  end,
}

export enum ResetDirective {
  sessionOnly,
  parameters,
  sessionAndParameters,
}

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

// 0: Return value of compressStream2/decompressStream
// 1: Bytes produced to dstBuf (output.pos)
// 2: Bytes consumed from srcBuf (input.pos)
type StreamResult = [number, number, number];

export class CCtx {
  compress(dstBuf: Uint8Array, srcBuf: Uint8Array, level: number): number;
  compressUsingDict(dstBuf: Uint8Array, srcBuf: Uint8Array, dictBuf: Uint8Array, level: number): number;
  compressUsingCDict(dstBuf: Uint8Array, srcBuf: Uint8Array, dict: CDict): number;
  setParameter(param: CParameter, value: number): void;
  setPledgedSrcSize(size: number): void;
  reset(reset: ResetDirective): void;
  compress2(dstBuf: Uint8Array, srcBuf: Uint8Array): number;
  compressStream2(dstBuf: Uint8Array, srcBuf: Uint8Array, endOp: EndDirective): StreamResult;
  loadDictionary(dictBuf: Uint8Array): void;
}

export class CDict {
  constructor(dictBuf: Uint8Array, level: number);
}

export class DCtx {
  decompress(dstBuf: Uint8Array, srcBuf: Uint8Array): number;
  decompressStream(dstBuf: Uint8Array, srcBuf: Uint8Array): StreamResult;
  decompressUsingDict(dstBuf: Uint8Array, srcBuf: Uint8Array, dictBuf: Uint8Array): number;
  decompressUsingDDict(dstBuf: Uint8Array, srcBuf: Uint8Array, dict: DDict): number;
  setParameter(param: DParameter, value: number): void;
  reset(reset: ResetDirective): void;
  loadDictionary(dictBuf: Uint8Array): void;
}

export class DDict {
  constructor(dictBuf: Uint8Array);
  getDictID(): number;
}

export interface Bounds {
  lowerBound: number;
  upperBound: number;
}

export function versionNumber(): number;
export function versionString(): string;
export function compress(dstBuf: Uint8Array, srcBuf: Uint8Array, level: number): number;
export function decompress(dstBuf: Uint8Array, srcBuf: Uint8Array): number;
export function getFrameContentSize(frameBuf: Uint8Array): number | null;
export function findFrameCompressedSize(frameBuf: Uint8Array): number;
export function compressBound(srcSize: number): number;
export function minCLevel(): number;
export function maxCLevel(): number;
export function cParamGetBounds(param: CParameter): Bounds;
export function dParamGetBounds(param: DParameter): Bounds;
export function cStreamInSize(): number;
export function cStreamOutSize(): number;
export function dStreamInSize(): number;
export function dStreamOutSize(): number;
export function getDictIDFromDict(dictBuf: Uint8Array): number;
export function getDictIDFromFrame(frameBuf: Uint8Array): number;

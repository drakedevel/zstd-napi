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

export class CCtx {
  compress(dstBuf: Uint8Array, srcBuf: Uint8Array, level: number): number;
  compressUsingCDict(dstBuf: Uint8Array, srcBuf: Uint8Array, dict: CDict): number;
  setParameter(param: CParameter.strategy, value: Strategy): void;
  setParameter(param: CParameter, value: number): void;
  setPledgedSrcSize(size: number): void;
  reset(reset: ResetDirective): void;
  compress2(dstBuf: Uint8Array, srcBuf: Uint8Array): void;
}

export class CDict {
  constructor(dictBuf: Uint8Array);
}

export class DCtx {
  decompress(dstBuf: Uint8Array, srcBuf: Uint8Array): number;
  decompressUsingDDict(dstBuf: Uint8Array, srcBuf: Uint8Array, dict: DDict): number;
  setParameter(param: DParameter, value: number): void;
  reset(reset: ResetDirective): void;
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
export function getFrameContentSize(frameBuf: Uint8Array): number | null;
export function findFrameCompressedSize(frameBuf: Uint8Array): number;
export function compressBound(srcSize: number): number;
export function minCLevel(): number;
export function maxCLevel(): number;
export function cParamGetBounds(param: CParameter): Bounds;
export function dParamGetBounds(param: DParameter): Bounds;
export function getDictIDFromDict(dictBuf: Uint8Array): number;
export function getDictIDFromFrame(frameBuf: Uint8Array): number;

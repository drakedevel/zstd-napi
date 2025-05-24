import { createRequire } from 'module';
const buildType =
  process.config.target_defaults?.default_configuration ?? 'Release';
const binding = createRequire(import.meta.url)(
  `./build/${buildType}/binding.node`,
);
export const CCtx = binding.CCtx;
export const CDict = binding.CDict;
export const CParameter = binding.CParameter;
export const DCtx = binding.DCtx;
export const DDict = binding.DDict;
export const DParameter = binding.DParameter;
export const EndDirective = binding.EndDirective;
export const MAGICNUMBER = binding.MAGICNUMBER;
export const MAGIC_DICTIONARY = binding.MAGIC_DICTIONARY;
export const MAGIC_SKIPPABLE_MASK = binding.MAGIC_SKIPPABLE_MASK;
export const MAGIC_SKIPPABLE_START = binding.MAGIC_SKIPPABLE_START;
export const ResetDirective = binding.ResetDirective;
export const Strategy = binding.Strategy;
export const cParamGetBounds = binding.cParamGetBounds;
export const cStreamInSize = binding.cStreamInSize;
export const cStreamOutSize = binding.cStreamOutSize;
export const compress = binding.compress;
export const compressBound = binding.compressBound;
export const dParamGetBounds = binding.dParamGetBounds;
export const dStreamInSize = binding.dStreamInSize;
export const dStreamOutSize = binding.dStreamOutSize;
export const decompress = binding.decompress;
export const defaultCLevel = binding.defaultCLevel;
export const findFrameCompressedSize = binding.findFrameCompressedSize;
export const getDictIDFromDict = binding.getDictIDFromDict;
export const getDictIDFromFrame = binding.getDictIDFromFrame;
export const getFrameContentSize = binding.getFrameContentSize;
export const maxCLevel = binding.maxCLevel;
export const minCLevel = binding.minCLevel;
export const versionNumber = binding.versionNumber;
export const versionString = binding.versionString;

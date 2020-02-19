#include <napi.h>

#include <cstdio>

#include "cctx.h"
#include "cdict.h"
#include "constants.h"
#include "dctx.h"
#include "ddict.h"
#include "util.h"

using namespace Napi;

// Version functions
Value wrapVersionNumber(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_versionNumber());
}

Value wrapVersionString(const CallbackInfo& info) {
  return String::New(info.Env(), ZSTD_versionString());
}

// Simple API
Value wrapCompress(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 3);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  int32_t level = info[2].ToNumber();

  size_t result = ZSTD_compress(dstBuf.Data(), dstBuf.ByteLength(),
                                srcBuf.Data(), srcBuf.ByteLength(), level);
  return convertZstdResult(env, result);
}

Value wrapDecompress(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 2);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();

  size_t result = ZSTD_decompress(dstBuf.Data(), dstBuf.ByteLength(),
                                  srcBuf.Data(), srcBuf.ByteLength());
  return convertZstdResult(env, result);
}

Value wrapGetFrameContentSize(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array frameBuf = info[0].As<Uint8Array>();

  unsigned long long size =
      ZSTD_getFrameContentSize(frameBuf.Data(), frameBuf.ByteLength());
  if (size == ZSTD_CONTENTSIZE_UNKNOWN)
    return env.Null();
  if (size == ZSTD_CONTENTSIZE_ERROR)
    throw Error::New(env, "Could not parse Zstandard header");
  return Number::New(env, size);
}

Value wrapFindFrameCompressedSize(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array frameBuf = info[0].As<Uint8Array>();

  return convertZstdResult(env, ZSTD_findFrameCompressedSize(
                                    frameBuf.Data(), frameBuf.ByteLength()));
}

// Helper functions
Value wrapCompressBound(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 1);
  int64_t size = info[0].ToNumber();

  return Number::New(env, ZSTD_compressBound(size));
}

Value wrapMinCLevel(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_minCLevel());
}

Value wrapMaxCLevel(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_maxCLevel());
}

// Advanced compression
static inline Value convertParamBounds(Env env, const ZSTD_bounds& bounds) {
  checkZstdError(env, bounds.error);
  Object result = Object::New(env);
  result["lowerBound"] = bounds.lowerBound;
  result["upperBound"] = bounds.upperBound;
  return result;
}

Value wrapCParamGetBounds(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 1);
  ZSTD_cParameter param =
      static_cast<ZSTD_cParameter>(info[0].ToNumber().Int32Value());

  return convertParamBounds(env, ZSTD_cParam_getBounds(param));
}

// Advanced decompression
Value wrapDParamGetBounds(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 1);
  ZSTD_dParameter param =
      static_cast<ZSTD_dParameter>(info[0].ToNumber().Int32Value());

  return convertParamBounds(env, ZSTD_dParam_getBounds(param));
}

// Streaming compression
Value wrapCStreamInSize(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_CStreamInSize());
}

Value wrapCStreamOutSize(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_CStreamOutSize());
}

// Streaming decompression
Value wrapDStreamInSize(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_DStreamInSize());
}

Value wrapDStreamOutSize(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_DStreamOutSize());
}

// Dictionary helper functions
Value wrapGetDictIDFromDict(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array dictBuf = info[0].As<Uint8Array>();
  return Number::New(
      env, ZSTD_getDictID_fromDict(dictBuf.Data(), dictBuf.ByteLength()));
}

Value wrapGetDictIDFromFrame(const CallbackInfo& info) {
  Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array frameBuf = info[0].As<Uint8Array>();
  return Number::New(
      env, ZSTD_getDictID_fromFrame(frameBuf.Data(), frameBuf.ByteLength()));
}

Object ModuleInit(Env env, Object exports) {
  CCtx::Init(env, exports);
  CDict::Init(env, exports);
  DCtx::Init(env, exports);
  DDict::Init(env, exports);

  createConstants(env, exports);
  createEnums(env, exports);

  exports.DefineProperties({
      PropertyDescriptor::Function(env, exports, "versionNumber",
                                   wrapVersionNumber),
      PropertyDescriptor::Function(env, exports, "versionString",
                                   wrapVersionString),
      PropertyDescriptor::Function(env, exports, "compress", wrapCompress),
      PropertyDescriptor::Function(env, exports, "decompress", wrapDecompress),
      PropertyDescriptor::Function(env, exports, "getFrameContentSize",
                                   wrapGetFrameContentSize),
      PropertyDescriptor::Function(env, exports, "findFrameCompressedSize",
                                   wrapFindFrameCompressedSize),
      PropertyDescriptor::Function(env, exports, "compressBound",
                                   wrapCompressBound),
      PropertyDescriptor::Function(env, exports, "minCLevel", wrapMinCLevel),
      PropertyDescriptor::Function(env, exports, "maxCLevel", wrapMaxCLevel),
      PropertyDescriptor::Function(env, exports, "cParamGetBounds",
                                   wrapCParamGetBounds),
      PropertyDescriptor::Function(env, exports, "dParamGetBounds",
                                   wrapDParamGetBounds),
      PropertyDescriptor::Function(env, exports, "cStreamInSize",
                                   wrapCStreamInSize),
      PropertyDescriptor::Function(env, exports, "cStreamOutSize",
                                   wrapCStreamOutSize),
      PropertyDescriptor::Function(env, exports, "dStreamInSize",
                                   wrapDStreamInSize),
      PropertyDescriptor::Function(env, exports, "dStreamOutSize",
                                   wrapDStreamOutSize),
      PropertyDescriptor::Function(env, exports, "getDictIDFromDict",
                                   wrapGetDictIDFromDict),
      PropertyDescriptor::Function(env, exports, "getDictIDFromFrame",
                                   wrapGetDictIDFromFrame),
  });

  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, ModuleInit)

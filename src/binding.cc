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

Value wrapDefaultCLevel(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_defaultCLevel());
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

Value wrapLeakTest(const CallbackInfo& info) {
  int* value = (int*)malloc(sizeof(int));
  *value = 42;
  printf("Leaked read: %d\n", *value);
  return info.Env().Undefined();
}

Value wrapUseFreeTest(const CallbackInfo& info) {
  int* uninitialized = (int*)malloc(sizeof(int));
  *uninitialized = 0;
  free(uninitialized);
  printf("Use-after-free: %d\n", *uninitialized);
  return info.Env().Undefined();
}

// This is a copy of PropertyDescriptor::Function, except it uses the templated
// version of Function::New instead of the heap-allocating one. Should be
// replaced when added upstream (not yet added as of 7.x).
template <Function::Callback cb>
inline PropertyDescriptor propertyDescFunction(
    Env env,
    Object /*object*/,
    const char* utf8name,
    napi_property_attributes attributes = napi_default,
    void* data = nullptr) {
  return PropertyDescriptor({utf8name, nullptr, nullptr, nullptr, nullptr,
                             Napi::Function::New<cb>(env, utf8name, data),
                             attributes, nullptr});
}

Object ModuleInit(Env env, Object exports) {
  CCtx::Init(env, exports);
  CDict::Init(env, exports);
  DCtx::Init(env, exports);
  DDict::Init(env, exports);

  createConstants(env, exports);
  createEnums(env, exports);

  exports.DefineProperties({
      propertyDescFunction<wrapVersionNumber>(env, exports, "versionNumber"),
      propertyDescFunction<wrapVersionString>(env, exports, "versionString"),
      propertyDescFunction<wrapCompress>(env, exports, "compress"),
      propertyDescFunction<wrapDecompress>(env, exports, "decompress"),
      propertyDescFunction<wrapGetFrameContentSize>(env, exports,
                                                    "getFrameContentSize"),
      propertyDescFunction<wrapFindFrameCompressedSize>(
          env, exports, "findFrameCompressedSize"),
      propertyDescFunction<wrapCompressBound>(env, exports, "compressBound"),
      propertyDescFunction<wrapMinCLevel>(env, exports, "minCLevel"),
      propertyDescFunction<wrapMaxCLevel>(env, exports, "maxCLevel"),
      propertyDescFunction<wrapDefaultCLevel>(env, exports, "defaultCLevel"),
      propertyDescFunction<wrapCParamGetBounds>(env, exports,
                                                "cParamGetBounds"),
      propertyDescFunction<wrapDParamGetBounds>(env, exports,
                                                "dParamGetBounds"),
      propertyDescFunction<wrapCStreamInSize>(env, exports, "cStreamInSize"),
      propertyDescFunction<wrapCStreamOutSize>(env, exports, "cStreamOutSize"),
      propertyDescFunction<wrapDStreamInSize>(env, exports, "dStreamInSize"),
      propertyDescFunction<wrapDStreamOutSize>(env, exports, "dStreamOutSize"),
      propertyDescFunction<wrapGetDictIDFromDict>(env, exports,
                                                  "getDictIDFromDict"),
      propertyDescFunction<wrapGetDictIDFromFrame>(env, exports,
                                                   "getDictIDFromFrame"),
      propertyDescFunction<wrapLeakTest>(env, exports, "leakTest"),
      propertyDescFunction<wrapUseFreeTest>(env, exports, "useFreeTest"),
  });

  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, ModuleInit)

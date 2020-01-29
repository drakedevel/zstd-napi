#include <napi.h>

#include <cstdio>

#include "cctx.h"
#include "cdict.h"
#include "dctx.h"
#include "ddict.h"
#include "zstd_util.h"

using namespace Napi;

// Version functions
Value wrapVersionNumber(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_versionNumber());
}

Value wrapVersionString(const CallbackInfo& info) {
  return String::New(info.Env(), ZSTD_versionString());
}

// Simple API
Value wrapGetFrameContentSize(const CallbackInfo& info) {
  Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> frameBuf = info[0].As<Buffer<char>>();

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
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> frameBuf = info[0].As<Buffer<char>>();

  return convertZstdResult(env, ZSTD_findFrameCompressedSize(
                                    frameBuf.Data(), frameBuf.ByteLength()));
}

// Helper functions
Value wrapCompressBound(const CallbackInfo& info) {
  Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  int64_t size = info[0].ToNumber().As<Number>();

  return Number::New(env, ZSTD_compressBound(size));
}

Value wrapMinCLevel(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_minCLevel());
}

Value wrapMaxCLevel(const CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_maxCLevel());
}

// Dictionary helper functions
Value wrapGetDictIDFromDict(const CallbackInfo& info) {
  Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> dictBuf = info[0].As<Buffer<char>>();
  return Number::New(
      env, ZSTD_getDictID_fromDict(dictBuf.Data(), dictBuf.ByteLength()));
}

Value wrapGetDictIDFromFrame(const CallbackInfo& info) {
  Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> frameBuf = info[0].As<Buffer<char>>();
  return Number::New(
      env, ZSTD_getDictID_fromFrame(frameBuf.Data(), frameBuf.ByteLength()));
}

Object ModuleInit(Env env, Object exports) {
  CCtx::Init(env, exports);
  CDict::Init(env, exports);
  DCtx::Init(env, exports);
  DDict::Init(env, exports);

  exports.DefineProperties({
      PropertyDescriptor::Function(env, exports, "versionNumber",
                                   wrapVersionNumber),
      PropertyDescriptor::Function(env, exports, "versionString",
                                   wrapVersionString),
      PropertyDescriptor::Function(env, exports, "getFrameContentSize",
                                   wrapGetFrameContentSize),
      PropertyDescriptor::Function(env, exports, "findFrameCompressedSize",
                                   wrapFindFrameCompressedSize),
      PropertyDescriptor::Function(env, exports, "compressBound",
                                   wrapCompressBound),
      PropertyDescriptor::Function(env, exports, "minCLevel", wrapMinCLevel),
      PropertyDescriptor::Function(env, exports, "maxCLevel", wrapMaxCLevel),
      PropertyDescriptor::Function(env, exports, "getDictIDFromDict",
                                   wrapGetDictIDFromDict),
      PropertyDescriptor::Function(env, exports, "getDictIDFromFrame",
                                   wrapGetDictIDFromFrame),
  });

  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, ModuleInit)

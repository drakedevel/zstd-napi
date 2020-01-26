#include <napi.h>

#include <cstdio>

#include "cctx.h"
#include "cdict.h"
#include "dctx.h"
#include "ddict.h"

using namespace Napi;

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
      PropertyDescriptor::Function(env, exports, "getDictIDFromDict",
                                   wrapGetDictIDFromDict),
      PropertyDescriptor::Function(env, exports, "getDictIDFromFrame",
                                   wrapGetDictIDFromFrame),
  });

  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, ModuleInit)

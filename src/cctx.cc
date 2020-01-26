#include "cctx.h"

#include "cdict.h"
#include "zstd_util.h"

using namespace Napi;

Napi::FunctionReference CCtx::constructor;

Napi::Object CCtx::Init(Napi::Env env, Napi::Object exports) {
  Function func = DefineClass(
      env, "CCtx",
      {
          InstanceMethod("compress", &CCtx::wrapCompress),
          InstanceMethod("compressUsingCDict", &CCtx::wrapCompressUsingCDict),
      });
  constructor = Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("CCtx", func);
  return exports;
}

CCtx::CCtx(const Napi::CallbackInfo& info) : Napi::ObjectWrap<CCtx>(info) {
  cctx = ZSTD_createCCtx();
}

CCtx::~CCtx() {
  ZSTD_freeCCtx(cctx);
  cctx = nullptr;
}

Napi::Value CCtx::wrapCompress(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 3)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> inBuf = info[0].As<Buffer<char>>();
  Buffer<char> outBuf = info[1].As<Buffer<char>>();
  int32_t level = info[2].As<Number>().Int32Value();

  size_t result = ZSTD_compressCCtx(cctx, outBuf.Data(), outBuf.ByteLength(),
                                    inBuf.Data(), inBuf.ByteLength(), level);
  return convertZstdResult(env, result);
}

Napi::Value CCtx::wrapCompressUsingCDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 3)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> inBuf = info[0].As<Buffer<char>>();
  Buffer<char> outBuf = info[1].As<Buffer<char>>();
  CDict* cdictObj = CDict::Unwrap(info[2].As<Object>());

  size_t result = ZSTD_compress_usingCDict(cctx, outBuf.Data(),
                                           outBuf.ByteLength(), inBuf.Data(),
                                           inBuf.ByteLength(), cdictObj->cdict);
  return convertZstdResult(env, result);
}

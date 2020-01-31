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
          InstanceMethod("setParameter", &CCtx::wrapSetParameter),
          InstanceMethod("setPledgedSrcSize", &CCtx::wrapSetPledgedSrcSize),
          InstanceMethod("reset", &CCtx::wrapReset),
          InstanceMethod("compress2", &CCtx::wrapCompress2),
      });
  constructor = Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("CCtx", func);
  return exports;
}

CCtx::CCtx(const Napi::CallbackInfo& info) : ObjectWrapHelper<CCtx>(info) {
  cctx = ZSTD_createCCtx();
  adjustMemory(info.Env());
}

CCtx::~CCtx() {
  ZSTD_freeCCtx(cctx);
  cctx = nullptr;
}

Napi::Value CCtx::wrapCompress(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 3)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  int32_t level = info[2].As<Number>();

  size_t result = ZSTD_compressCCtx(cctx, dstBuf.Data(), dstBuf.ByteLength(),
                                    srcBuf.Data(), srcBuf.ByteLength(), level);
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value CCtx::wrapCompressUsingCDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 3)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  CDict* cdictObj = CDict::Unwrap(info[2].As<Object>());

  size_t result = ZSTD_compress_usingCDict(
      cctx, dstBuf.Data(), dstBuf.ByteLength(), srcBuf.Data(),
      srcBuf.ByteLength(), cdictObj->cdict);
  adjustMemory(env);
  return convertZstdResult(env, result);
}

void CCtx::wrapSetParameter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 2)
    throw TypeError::New(env, "Wrong arguments");
  ZSTD_cParameter param =
      static_cast<ZSTD_cParameter>(info[0].ToNumber().Int32Value());
  int value = info[1].ToNumber();

  size_t result = ZSTD_CCtx_setParameter(cctx, param, value);
  adjustMemory(env);
  checkZstdError(env, result);
}

void CCtx::wrapSetPledgedSrcSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  unsigned long long srcSize = info[0].ToNumber().Int64Value();

  size_t result = ZSTD_CCtx_setPledgedSrcSize(cctx, srcSize);
  adjustMemory(env);
  checkZstdError(env, result);
}

void CCtx::wrapReset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  ZSTD_ResetDirective reset =
      static_cast<ZSTD_ResetDirective>(info[0].ToNumber().Int32Value());

  size_t result = ZSTD_CCtx_reset(cctx, reset);
  adjustMemory(env);
  checkZstdError(env, result);
}

Napi::Value CCtx::wrapCompress2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 2)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();

  size_t result = ZSTD_compress2(cctx, dstBuf.Data(), dstBuf.ByteLength(),
                                 srcBuf.Data(), srcBuf.ByteLength());
  adjustMemory(env);
  return convertZstdResult(env, result);
}

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
          InstanceMethod("compressUsingDict", &CCtx::wrapCompressUsingDict),
          InstanceMethod("compressUsingCDict", &CCtx::wrapCompressUsingCDict),
          InstanceMethod("setParameter", &CCtx::wrapSetParameter),
          InstanceMethod("setPledgedSrcSize", &CCtx::wrapSetPledgedSrcSize),
          InstanceMethod("reset", &CCtx::wrapReset),
          InstanceMethod("compress2", &CCtx::wrapCompress2),
          InstanceMethod("compressStream2", &CCtx::wrapCompressStream2),
          InstanceMethod("loadDictionary", &CCtx::wrapLoadDictionary),
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
  int32_t level = info[2].ToNumber();

  size_t result = ZSTD_compressCCtx(cctx, dstBuf.Data(), dstBuf.ByteLength(),
                                    srcBuf.Data(), srcBuf.ByteLength(), level);
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value CCtx::wrapCompressUsingDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 4)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  Uint8Array dictBuf = info[2].As<Uint8Array>();
  int32_t level = info[3].ToNumber();

  size_t result = ZSTD_compress_usingDict(
      cctx, dstBuf.Data(), dstBuf.ByteLength(), srcBuf.Data(),
      srcBuf.ByteLength(), dictBuf.Data(), dictBuf.ByteLength(), level);
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

Napi::Value CCtx::wrapCompressStream2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 3)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  ZSTD_EndDirective endOp =
      static_cast<ZSTD_EndDirective>(info[2].ToNumber().Int32Value());

  ZSTD_outBuffer zstdOut = {
      .dst = dstBuf.Data(),
      .size = dstBuf.ByteLength(),
      .pos = 0,
  };
  ZSTD_inBuffer zstdIn = {
      .src = srcBuf.Data(),
      .size = srcBuf.ByteLength(),
      .pos = 0,
  };
  size_t ret = ZSTD_compressStream2(cctx, &zstdOut, &zstdIn, endOp);
  adjustMemory(env);
  Number toFlush = convertZstdResult(env, ret);

  Object result = Object::New(env);
  result["toFlush"] = toFlush;
  result["dstProduced"] = zstdOut.pos;
  result["srcConsumed"] = zstdIn.pos;
  return result;
}

void CCtx::wrapLoadDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dictBuf = info[0].As<Uint8Array>();

  size_t result =
      ZSTD_CCtx_loadDictionary(cctx, dictBuf.Data(), dictBuf.ByteLength());
  adjustMemory(env);
  checkZstdError(env, result);
}

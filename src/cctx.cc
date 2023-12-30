#include "cctx.h"

#include "cdict.h"

using namespace Napi;

const napi_type_tag CCtx::typeTag = {0xced16821986135b4, 0x11b09ca57b5ab06c};

void CCtx::Init(Napi::Env env, Napi::Object exports) {
  Function func = DefineClass(
      env, "CCtx",
      {
          InstanceMethod<&CCtx::wrapCompress>("compress"),
          InstanceMethod<&CCtx::wrapCompressUsingDict>("compressUsingDict"),
          InstanceMethod<&CCtx::wrapCompressUsingCDict>("compressUsingCDict"),
          InstanceMethod<&CCtx::wrapSetParameter>("setParameter"),
          InstanceMethod<&CCtx::wrapSetPledgedSrcSize>("setPledgedSrcSize"),
          InstanceMethod<&CCtx::wrapReset>("reset"),
          InstanceMethod<&CCtx::wrapCompress2>("compress2"),
          InstanceMethod<&CCtx::wrapCompressStream2>("compressStream2"),
          InstanceMethod<&CCtx::wrapLoadDictionary>("loadDictionary"),
      });
  exports.Set("CCtx", func);
}

CCtx::CCtx(const Napi::CallbackInfo& info) : ObjectWrapHelper<CCtx>(info) {
  cctx.reset(ZSTD_createCCtx());
  adjustMemory(info.Env());
}

Napi::Value CCtx::wrapCompress(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 3);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  int32_t level = info[2].ToNumber();

  size_t result =
      ZSTD_compressCCtx(cctx.get(), dstBuf.Data(), dstBuf.ByteLength(),
                        srcBuf.Data(), srcBuf.ByteLength(), level);
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value CCtx::wrapCompressUsingDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 4);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  Uint8Array dictBuf = info[2].As<Uint8Array>();
  int32_t level = info[3].ToNumber();

  size_t result = ZSTD_compress_usingDict(
      cctx.get(), dstBuf.Data(), dstBuf.ByteLength(), srcBuf.Data(),
      srcBuf.ByteLength(), dictBuf.Data(), dictBuf.ByteLength(), level);
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value CCtx::wrapCompressUsingCDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 3);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  CDict* cdictObj = CDict::Unwrap(info[2].As<Object>());

  size_t result = ZSTD_compress_usingCDict(
      cctx.get(), dstBuf.Data(), dstBuf.ByteLength(), srcBuf.Data(),
      srcBuf.ByteLength(), cdictObj->cdict.get());
  adjustMemory(env);
  return convertZstdResult(env, result);
}

void CCtx::wrapSetParameter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 2);
  ZSTD_cParameter param =
      static_cast<ZSTD_cParameter>(info[0].ToNumber().Int32Value());
  int value = info[1].ToNumber();

  size_t result = ZSTD_CCtx_setParameter(cctx.get(), param, value);
  adjustMemory(env);
  checkZstdError(env, result);
}

void CCtx::wrapSetPledgedSrcSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 1);
  unsigned long long srcSize = info[0].ToNumber().Int64Value();

  size_t result = ZSTD_CCtx_setPledgedSrcSize(cctx.get(), srcSize);
  adjustMemory(env);
  checkZstdError(env, result);
}

void CCtx::wrapReset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 1);
  ZSTD_ResetDirective reset =
      static_cast<ZSTD_ResetDirective>(info[0].ToNumber().Int32Value());

  size_t result = ZSTD_CCtx_reset(cctx.get(), reset);
  adjustMemory(env);
  checkZstdError(env, result);
}

Napi::Value CCtx::wrapCompress2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 2);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();

  size_t result = ZSTD_compress2(cctx.get(), dstBuf.Data(), dstBuf.ByteLength(),
                                 srcBuf.Data(), srcBuf.ByteLength());
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value CCtx::wrapCompressStream2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 3);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  ZSTD_EndDirective endOp =
      static_cast<ZSTD_EndDirective>(info[2].ToNumber().Int32Value());

  ZSTD_outBuffer zstdOut = makeZstdOutBuffer(dstBuf);
  ZSTD_inBuffer zstdIn = makeZstdInBuffer(srcBuf);
  size_t ret = ZSTD_compressStream2(cctx.get(), &zstdOut, &zstdIn, endOp);
  adjustMemory(env);
  return makeStreamResult(env, ret, zstdOut, zstdIn);
}

void CCtx::wrapLoadDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array dictBuf = info[0].As<Uint8Array>();

  size_t result = ZSTD_CCtx_loadDictionary(cctx.get(), dictBuf.Data(),
                                           dictBuf.ByteLength());
  adjustMemory(env);
  checkZstdError(env, result);
}

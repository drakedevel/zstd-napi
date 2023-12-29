#include "dctx.h"

#include "ddict.h"

using namespace Napi;

void DCtx::Init(Napi::Env env, Napi::Object exports) {
  Function func = DefineClass(
      env, "DCtx",
      {
          InstanceMethod<&DCtx::wrapDecompress>("decompress"),
          InstanceMethod<&DCtx::wrapDecompressStream>("decompressStream"),
          InstanceMethod<&DCtx::wrapDecompressUsingDict>("decompressUsingDict"),
          InstanceMethod<&DCtx::wrapDecompressUsingDDict>(
              "decompressUsingDDict"),
          InstanceMethod<&DCtx::wrapSetParameter>("setParameter"),
          InstanceMethod<&DCtx::wrapReset>("reset"),
          InstanceMethod<&DCtx::wrapLoadDictionary>("loadDictionary"),
      });
  exports.Set("DCtx", func);
}

DCtx::DCtx(const Napi::CallbackInfo& info) : ObjectWrapHelper<DCtx>(info) {
  dctx.reset(ZSTD_createDCtx());
  adjustMemory(info.Env());
}

Napi::Value DCtx::wrapDecompress(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 2);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();

  size_t result =
      ZSTD_decompressDCtx(dctx.get(), dstBuf.Data(), dstBuf.ByteLength(),
                          srcBuf.Data(), srcBuf.ByteLength());
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value DCtx::wrapDecompressStream(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 2);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();

  ZSTD_outBuffer zstdOut = makeZstdOutBuffer(dstBuf);
  ZSTD_inBuffer zstdIn = makeZstdInBuffer(srcBuf);
  size_t ret = ZSTD_decompressStream(dctx.get(), &zstdOut, &zstdIn);
  adjustMemory(env);
  return makeStreamResult(env, ret, zstdOut, zstdIn);
}

Napi::Value DCtx::wrapDecompressUsingDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 3);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  Uint8Array dictBuf = info[2].As<Uint8Array>();

  size_t result = ZSTD_decompress_usingDict(
      dctx.get(), dstBuf.Data(), dstBuf.ByteLength(), srcBuf.Data(),
      srcBuf.ByteLength(), dictBuf.Data(), dictBuf.ByteLength());
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value DCtx::wrapDecompressUsingDDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 3);
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  DDict* ddictObj = DDict::Unwrap(info[2].As<Object>());

  size_t result = ZSTD_decompress_usingDDict(
      dctx.get(), dstBuf.Data(), dstBuf.ByteLength(), srcBuf.Data(),
      srcBuf.ByteLength(), ddictObj->ddict.get());
  adjustMemory(env);
  return convertZstdResult(env, result);
}

void DCtx::wrapSetParameter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 2);
  ZSTD_dParameter param =
      static_cast<ZSTD_dParameter>(info[0].ToNumber().Int32Value());
  int value = info[1].ToNumber();

  size_t result = ZSTD_DCtx_setParameter(dctx.get(), param, value);
  adjustMemory(env);
  checkZstdError(env, result);
}

void DCtx::wrapReset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 1);
  ZSTD_ResetDirective reset =
      static_cast<ZSTD_ResetDirective>(info[0].ToNumber().Int32Value());

  size_t result = ZSTD_DCtx_reset(dctx.get(), reset);
  adjustMemory(env);
  checkZstdError(env, result);
}

void DCtx::wrapLoadDictionary(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array dictBuf = info[0].As<Uint8Array>();

  size_t result = ZSTD_DCtx_loadDictionary(dctx.get(), dictBuf.Data(),
                                           dictBuf.ByteLength());
  adjustMemory(env);
  checkZstdError(env, result);
}

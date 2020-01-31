#include "dctx.h"

#include "ddict.h"
#include "zstd_util.h"

using namespace Napi;

Napi::FunctionReference DCtx::constructor;

Napi::Object DCtx::Init(Napi::Env env, Napi::Object exports) {
  Function func =
      DefineClass(env, "DCtx",
                  {
                      InstanceMethod("decompress", &DCtx::wrapDecompress),
                      InstanceMethod("decompressUsingDDict",
                                     &DCtx::wrapDecompressUsingDDict),
                      InstanceMethod("setParameter", &DCtx::wrapSetParameter),
                      InstanceMethod("reset", &DCtx::wrapReset),
                  });
  constructor = Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("DCtx", func);
  return exports;
}

DCtx::DCtx(const Napi::CallbackInfo& info) : ObjectWrapHelper<DCtx>(info) {
  dctx = ZSTD_createDCtx();
  adjustMemory(info.Env());
}

DCtx::~DCtx() {
  ZSTD_freeDCtx(dctx);
  dctx = nullptr;
}

Napi::Value DCtx::wrapDecompress(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 2)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();

  size_t result = ZSTD_decompressDCtx(dctx, dstBuf.Data(), dstBuf.ByteLength(),
                                      srcBuf.Data(), srcBuf.ByteLength());
  adjustMemory(env);
  return convertZstdResult(env, result);
}

Napi::Value DCtx::wrapDecompressUsingDDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 3)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dstBuf = info[0].As<Uint8Array>();
  Uint8Array srcBuf = info[1].As<Uint8Array>();
  DDict* ddictObj = DDict::Unwrap(info[2].As<Object>());

  size_t result = ZSTD_decompress_usingDDict(
      dctx, dstBuf.Data(), dstBuf.ByteLength(), srcBuf.Data(),
      srcBuf.ByteLength(), ddictObj->ddict);
  adjustMemory(env);
  return convertZstdResult(env, result);
}

void DCtx::wrapSetParameter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 2)
    throw TypeError::New(env, "Wrong arguments");
  ZSTD_dParameter param =
      static_cast<ZSTD_dParameter>(info[0].ToNumber().Int32Value());
  int value = info[1].ToNumber();

  size_t result = ZSTD_DCtx_setParameter(dctx, param, value);
  adjustMemory(env);
  checkZstdError(env, result);
}

void DCtx::wrapReset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  ZSTD_ResetDirective reset =
      static_cast<ZSTD_ResetDirective>(info[0].ToNumber().Int32Value());

  size_t result = ZSTD_DCtx_reset(dctx, reset);
  adjustMemory(env);
  checkZstdError(env, result);
}

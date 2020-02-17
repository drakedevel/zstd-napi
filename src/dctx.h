#ifndef DCTX_H
#define DCTX_H

#include <napi.h>

#include "object_wrap_helper.h"
#include "zstd.h"

class DCtx : public ObjectWrapHelper<DCtx> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);
  DCtx(const Napi::CallbackInfo& info);
  virtual ~DCtx();

 private:
  ZSTD_DCtx* dctx;

  int64_t getCurrentSize() { return ZSTD_sizeof_DCtx(dctx); }

  Napi::Value wrapDecompress(const Napi::CallbackInfo& info);
  Napi::Value wrapDecompressStream(const Napi::CallbackInfo& info);
  Napi::Value wrapDecompressUsingDict(const Napi::CallbackInfo& info);
  Napi::Value wrapDecompressUsingDDict(const Napi::CallbackInfo& info);
  void wrapSetParameter(const Napi::CallbackInfo& info);
  void wrapReset(const Napi::CallbackInfo& info);
  void wrapLoadDictionary(const Napi::CallbackInfo& info);
};

#endif

#ifndef DCTX_H
#define DCTX_H

#include <napi.h>

#include "object_wrap_helper.h"
#include "util.h"
#include "zstd.h"

class DCtx : public ObjectWrapHelper<DCtx> {
 public:
  static const napi_type_tag typeTag;
  static void Init(Napi::Env env, Napi::Object exports);
  DCtx(const Napi::CallbackInfo& info);

 private:
  zstd_unique_ptr<ZSTD_DCtx, ZSTD_freeDCtx> dctx;

  int64_t getCurrentSize() { return ZSTD_sizeof_DCtx(dctx.get()); }

  Napi::Value wrapDecompress(const Napi::CallbackInfo& info);
  Napi::Value wrapDecompressStream(const Napi::CallbackInfo& info);
  Napi::Value wrapDecompressUsingDict(const Napi::CallbackInfo& info);
  Napi::Value wrapDecompressUsingDDict(const Napi::CallbackInfo& info);
  void wrapSetParameter(const Napi::CallbackInfo& info);
  void wrapReset(const Napi::CallbackInfo& info);
  void wrapLoadDictionary(const Napi::CallbackInfo& info);
};

#endif

#ifndef DCTX_H
#define DCTX_H

#include <napi.h>

#include "zstd.h"

class DCtx : public Napi::ObjectWrap<DCtx> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  DCtx(const Napi::CallbackInfo& info);
  virtual ~DCtx();

 private:
  static Napi::FunctionReference constructor;
  ZSTD_DCtx* dctx;

  Napi::Value wrapDecompress(const Napi::CallbackInfo& info);
};

#endif

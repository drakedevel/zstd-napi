#ifndef CDICT_H
#define CDICT_H

#include <napi.h>

#include "object_wrap_helper.h"
#include "zstd.h"

class CDict : public ObjectWrapHelper<CDict> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  CDict(const Napi::CallbackInfo& info);
  virtual ~CDict();

 private:
  friend class CCtx;
  static Napi::FunctionReference constructor;
  ZSTD_CDict* cdict;

  int64_t getCurrentSize() { return ZSTD_sizeof_CDict(cdict); }
};

#endif

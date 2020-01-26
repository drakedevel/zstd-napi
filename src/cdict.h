#ifndef CDICT_H
#define CDICT_H

#include <napi.h>

#include "zstd.h"

class CDict : public Napi::ObjectWrap<CDict> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  CDict(const Napi::CallbackInfo& info);
  virtual ~CDict();

 private:
  friend class CCtx;
  static Napi::FunctionReference constructor;
  ZSTD_CDict* cdict;
};

#endif

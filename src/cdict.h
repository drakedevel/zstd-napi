#ifndef CDICT_H
#define CDICT_H

#include <napi.h>

#include "object_wrap_helper.h"
#include "util.h"
#include "zstd.h"

class CDict : public ObjectWrapHelper<CDict> {
 public:
  static const napi_type_tag typeTag;
  static void Init(Napi::Env env, Napi::Object exports);
  CDict(const Napi::CallbackInfo& info);

 private:
  friend class CCtx;
  zstd_unique_ptr<ZSTD_CDict, ZSTD_freeCDict> cdict;

  int64_t getCurrentSize() { return ZSTD_sizeof_CDict(cdict.get()); }
};

#endif

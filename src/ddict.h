#ifndef DDICT_H
#define DDICT_H

#include <napi.h>

#include "object_wrap_helper.h"
#include "util.h"
#include "zstd.h"

class DDict : public ObjectWrapHelper<DDict> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);
  DDict(const Napi::CallbackInfo& info);

 private:
  friend class DCtx;
  zstd_unique_ptr<ZSTD_DDict, ZSTD_freeDDict> ddict;

  int64_t getCurrentSize() { return ZSTD_sizeof_DDict(ddict.get()); }

  Napi::Value wrapGetDictID(const Napi::CallbackInfo& info);
};

#endif

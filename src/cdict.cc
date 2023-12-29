#include "cdict.h"

using namespace Napi;

void CDict::Init(Napi::Env env, Napi::Object exports) {
  Function func = DefineClass(env, "CDict", {});
  exports.Set("CDict", func);
}

CDict::CDict(const Napi::CallbackInfo& info) : ObjectWrapHelper<CDict>(info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 2);
  Uint8Array dictBuf = info[0].As<Uint8Array>();
  int32_t level = info[1].ToNumber();

  cdict.reset(ZSTD_createCDict(dictBuf.Data(), dictBuf.ByteLength(), level));
  if (!cdict)
    throw Error::New(env, "Failed to create CDict");
  adjustMemory(env);
}

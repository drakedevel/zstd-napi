#include "cdict.h"

using namespace Napi;

Napi::FunctionReference CDict::constructor;

Napi::Object CDict::Init(Napi::Env env, Napi::Object exports) {
  Function func = DefineClass(env, "CDict", {});
  constructor = Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("CDict", func);
  return exports;
}

CDict::CDict(const Napi::CallbackInfo& info) : ObjectWrapHelper<CDict>(info) {
  Napi::Env env = info.Env();
  if (info.Length() != 2)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dictBuf = info[0].As<Uint8Array>();
  int32_t level = info[1].ToNumber();

  cdict = ZSTD_createCDict(dictBuf.Data(), dictBuf.ByteLength(), level);
  adjustMemory(env);
}

CDict::~CDict() {
  ZSTD_freeCDict(cdict);
  cdict = nullptr;
}

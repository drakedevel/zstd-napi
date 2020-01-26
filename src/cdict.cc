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

CDict::CDict(const Napi::CallbackInfo& info) : Napi::ObjectWrap<CDict>(info) {
  Napi::Env env = info.Env();
  if (info.Length() != 2)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> dictBuf = info[0].As<Buffer<char>>();
  int32_t level = info[1].As<Number>().Int32Value();

  cdict = ZSTD_createCDict(dictBuf.Data(), dictBuf.ByteLength(), level);
}

CDict::~CDict() {
  ZSTD_freeCDict(cdict);
  cdict = nullptr;
}

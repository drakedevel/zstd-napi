#include "ddict.h"

using namespace Napi;

Napi::FunctionReference DDict::constructor;

Napi::Object DDict::Init(Napi::Env env, Napi::Object exports) {
  Function func = DefineClass(env, "DDict", {});
  constructor = Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("DDict", func);
  return exports;
}

DDict::DDict(const Napi::CallbackInfo& info) : Napi::ObjectWrap<DDict>(info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> dictBuf = info[0].As<Buffer<char>>();

  ddict = ZSTD_createDDict(dictBuf.Data(), dictBuf.ByteLength());
}

DDict::~DDict() {
  ZSTD_freeDDict(ddict);
  ddict = nullptr;
}

#include "ddict.h"

using namespace Napi;

Napi::FunctionReference DDict::constructor;

Napi::Object DDict::Init(Napi::Env env, Napi::Object exports) {
  Function func =
      DefineClass(env, "DDict",
                  {
                      InstanceMethod("getDictID", &DDict::wrapGetDictID),
                  });
  constructor = Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("DDict", func);
  return exports;
}

DDict::DDict(const Napi::CallbackInfo& info) : ObjectWrapHelper<DDict>(info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Buffer<char> dictBuf = info[0].As<Buffer<char>>();

  ddict = ZSTD_createDDict(dictBuf.Data(), dictBuf.ByteLength());
  adjustMemory(env);
}

DDict::~DDict() {
  ZSTD_freeDDict(ddict);
  ddict = nullptr;
}

Napi::Value DDict::wrapGetDictID(const Napi::CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_getDictID_fromDDict(ddict));
}

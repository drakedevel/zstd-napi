#include "ddict.h"

using namespace Napi;

void DDict::Init(Napi::Env env, Napi::Object exports) {
  Function func =
      DefineClass(env, "DDict",
                  {
                      InstanceMethod("getDictID", &DDict::wrapGetDictID),
                  });
  exports.Set("DDict", func);
}

DDict::DDict(const Napi::CallbackInfo& info) : ObjectWrapHelper<DDict>(info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1)
    throw TypeError::New(env, "Wrong arguments");
  Uint8Array dictBuf = info[0].As<Uint8Array>();

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

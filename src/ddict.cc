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
  WRAP_CONSTRUCTOR_BEGIN;
  Napi::Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array dictBuf = info[0].As<Uint8Array>();

  ddict.reset(ZSTD_createDDict(dictBuf.Data(), dictBuf.ByteLength()));
  if (!ddict)
    throw Error::New(env, "Failed to create DDict");
  adjustMemory(env);
  WRAP_CONSTRUCTOR_END;
}

Napi::Value DDict::wrapGetDictID(const Napi::CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_getDictID_fromDDict(ddict.get()));
}

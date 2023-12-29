#include "ddict.h"

using namespace Napi;

void DDict::Init(Napi::Env env, Napi::Object exports) {
  Function func =
      DefineClass(env, "DDict",
                  {
                      InstanceMethod<&DDict::wrapGetDictID>("getDictID"),
                  });
  exports.Set("DDict", func);
}

DDict::DDict(const Napi::CallbackInfo& info) : ObjectWrapHelper<DDict>(info) {
  Napi::Env env = info.Env();
  checkArgCount(info, 1);
  Uint8Array dictBuf = info[0].As<Uint8Array>();

  ddict.reset(ZSTD_createDDict(dictBuf.Data(), dictBuf.ByteLength()));
  if (!ddict)
    throw Error::New(env, "Failed to create DDict");
  adjustMemory(env);
}

Napi::Value DDict::wrapGetDictID(const Napi::CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_getDictID_fromDDict(ddict.get()));
}

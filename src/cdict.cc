#include "cdict.h"

using namespace Napi;

const napi_type_tag CDict::typeTag = {0x9257fdef516e4f9c, 0x3efa685d51e7bb2b};

void CDict::Init(Napi::Env env, Napi::Object exports) {
  Function func =
      DefineClass(env, "CDict",
                  {
                      InstanceMethod<&CDict::wrapGetDictID>("getDictID"),
                  });
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

Napi::Value CDict::wrapGetDictID(const Napi::CallbackInfo& info) {
  return Number::New(info.Env(), ZSTD_getDictID_fromCDict(cdict.get()));
}

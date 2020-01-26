#include <napi.h>

#include <cstdio>

#include "cctx.h"
#include "cdict.h"
#include "dctx.h"
#include "ddict.h"

using namespace Napi;

Object ModuleInit(Env env, Object exports) {
  CCtx::Init(env, exports);
  CDict::Init(env, exports);
  DCtx::Init(env, exports);
  DDict::Init(env, exports);

  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, ModuleInit)

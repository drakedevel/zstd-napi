#ifndef ZSTD_UTIL_H
#define ZSTD_UTIL_H

#include <napi.h>

#include "zstd.h"

static Napi::Number convertZstdResult(Napi::Env env, size_t ret) {
  if (ZSTD_isError(ret))
    throw Napi::Error::New(env, ZSTD_getErrorName(ret));
  return Napi::Number::New(env, ret);
}

#endif

#ifndef UTIL_H
#define UTIL_H

#include <napi.h>

#include "zstd.h"

// Without fixes for node-addon-api #599 and #660, it's unsafe to throw Error
// exceptions from ObjectWrap subclass constructors. These helper macros will
// catch those exceptions and raise them in JavaScript without triggering the
// bug.
//
// Fixes have been merged (but not released) as of 2.0.0.
//
// TODO: Remove this workaround after upgrading to a fixed version.
#define WRAP_CONSTRUCTOR_BEGIN try {
#define WRAP_CONSTRUCTOR_END        \
  }                                 \
  catch (const Napi::Error& e) {    \
    e.ThrowAsJavaScriptException(); \
    return;                         \
  }

static inline void checkZstdError(Napi::Env env, size_t ret) {
  if (ZSTD_isError(ret))
    throw Napi::Error::New(env, ZSTD_getErrorName(ret));
}

static inline Napi::Number convertZstdResult(Napi::Env env, size_t ret) {
  checkZstdError(env, ret);
  return Napi::Number::New(env, ret);
}

static inline ZSTD_inBuffer makeZstdInBuffer(Napi::Uint8Array& buf) {
  ZSTD_inBuffer result;
  result.src = buf.Data();
  result.size = buf.ByteLength();
  result.pos = 0;
  return result;
}

static inline ZSTD_outBuffer makeZstdOutBuffer(Napi::Uint8Array& buf) {
  ZSTD_outBuffer result;
  result.dst = buf.Data();
  result.size = buf.ByteLength();
  result.pos = 0;
  return result;
}

static inline Napi::Value makeStreamResult(Napi::Env env,
                                           size_t ret,
                                           ZSTD_outBuffer& outBuf,
                                           ZSTD_inBuffer& inBuf) {
  // NB: An array is slightly faster than constructing an object here, since
  // N-API doesn't expose the relevant V8 features to speed that up.
  Napi::Array result = Napi::Array::New(env, 3);
  result[uint32_t(0)] = convertZstdResult(env, ret);
  result[1] = outBuf.pos;
  result[2] = inBuf.pos;
  return result;
}

#endif

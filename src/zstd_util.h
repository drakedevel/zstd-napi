#ifndef ZSTD_UTIL_H
#define ZSTD_UTIL_H

#include <napi.h>

#include "zstd.h"

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

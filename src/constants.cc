#include "constants.h"

#include "zstd.h"

using namespace Napi;

void createConstants(Env env, Object exports) {
#define C(v) exports[#v] = Number::New(env, ZSTD_##v)
  C(MAGICNUMBER);
  C(MAGIC_DICTIONARY);
  C(MAGIC_SKIPPABLE_START);
  C(MAGIC_SKIPPABLE_MASK);
#undef C
}

void createEnums(Env env, Object exports) {
#define ADD_ENUM_MEMBER(obj, pfx, name, jname)   \
  do {                                           \
    String vName = String::New(env, #jname);     \
    Number vValue = Number::New(env, pfx##name); \
    (obj)[vName] = vValue;                       \
    (obj)[vValue] = vName;                       \
  } while (0)

  // ZSTD_strategy
  Object strategy = Object::New(env);
#define E(name) ADD_ENUM_MEMBER(strategy, ZSTD_, name, name)
  E(fast);
  E(dfast);
  E(greedy);
  E(lazy);
  E(lazy2);
  E(btlazy2);
  E(btopt);
  E(btultra);
#undef E
  exports["Strategy"] = strategy;

  // ZSTD_cParameter
  Object cParameter = Object::New(env);
#define E(name) ADD_ENUM_MEMBER(cParameter, ZSTD_c_, name, name)
  E(compressionLevel);
  E(windowLog);
  E(hashLog);
  E(chainLog);
  E(searchLog);
  E(minMatch);
  E(targetLength);
  E(strategy);
  E(enableLongDistanceMatching);
  E(ldmHashLog);
  E(ldmMinMatch);
  E(ldmBucketSizeLog);
  E(ldmHashRateLog);
  E(contentSizeFlag);
  E(checksumFlag);
  E(dictIDFlag);
  E(nbWorkers);
  E(jobSize);
  E(overlapLog);
#undef E
  exports["CParameter"] = cParameter;

  // ZSTD_ResetDirective
  Object resetDirective = Object::New(env);
#define E(name, jname) ADD_ENUM_MEMBER(resetDirective, ZSTD_reset_, name, jname)
  E(session_only, sessionOnly);
  E(parameters, parameters);
  E(session_and_parameters, sessionAndParameters);
#undef E
  exports["ResetDirective"] = resetDirective;

  // ZSTD_dParameter
  Object dParameter = Object::New(env);
#define E(name) ADD_ENUM_MEMBER(dParameter, ZSTD_d_, name, name)
  E(windowLogMax);
#undef E
  exports["DParameter"] = dParameter;

  // ZSTD_EndDirective
  Object endDirective = Object::New(env);
#define E(name) ADD_ENUM_MEMBER(endDirective, ZSTD_e_, name, name)
  E(continue);
  E(flush);
  E(end);
#undef E
  exports["EndDirective"] = endDirective;

#undef ADD_ENUM_MEMBER
}

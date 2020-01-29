#ifndef CONSTANTS_H
#define CONSTANTS_H

#include <napi.h>

void createConstants(Napi::Env env, Napi::Object exports);
void createEnums(Napi::Env env, Napi::Object exports);

#endif

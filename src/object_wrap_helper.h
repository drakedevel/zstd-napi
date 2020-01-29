#ifndef OBJECT_WRAP_HELPER_H
#define OBJECT_WRAP_HELPER_H

#include <napi.h>

template <typename T>
class ObjectWrapHelper : public Napi::ObjectWrap<T> {
 public:
  ObjectWrapHelper(const Napi::CallbackInfo& info)
      : Napi::ObjectWrap<T>(info) {}
  virtual void Finalize(Napi::Env env) override;

 protected:
  void adjustMemory(Napi::Env env);

 private:
  int64_t lastSize;

  virtual int64_t getCurrentSize() = 0;
};

template <typename T>
void ObjectWrapHelper<T>::Finalize(Napi::Env env) {
  Napi::MemoryManagement::AdjustExternalMemory(env, -lastSize);
  lastSize = 0;
}

template <typename T>
void ObjectWrapHelper<T>::adjustMemory(Napi::Env env) {
  int64_t newSize = getCurrentSize();
  if (newSize != lastSize) {
    Napi::MemoryManagement::AdjustExternalMemory(env, newSize - lastSize);
    lastSize = newSize;
  }
}

#endif

#ifndef OBJECT_WRAP_HELPER_H
#define OBJECT_WRAP_HELPER_H

#include <napi.h>

template <typename T>
class ObjectWrapHelper : public Napi::ObjectWrap<T> {
 public:
  ObjectWrapHelper(const Napi::CallbackInfo& info) : Napi::ObjectWrap<T>(info) {
    info.This().As<Napi::Object>().TypeTag(&T::typeTag);
  }
  virtual void Finalize(Napi::Env env) override;

  static T* Unwrap(Napi::Object wrapper) {
    // This check prevents memory unsafety should a user pass a wrapped object
    // of the wrong type as a function parameter
    if (!wrapper.CheckTypeTag(&T::typeTag)) {
      throw Napi::TypeError::New(wrapper.Env(), "Native object tag mismatch");
    }
    return Napi::ObjectWrap<T>::Unwrap(wrapper);
  }

 protected:
  void adjustMemory(Napi::Env env);

 private:
  int64_t lastSize = 0;

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

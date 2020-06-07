import { strict as assert } from 'assert';

export function assertInvalidParameter(parameter: never): never {
  throw new RangeError(`Invalid parameter name: ${parameter as string}`);
}

export function tsAssert(value: unknown, msg?: string | Error): asserts value {
  assert(value, msg);
}

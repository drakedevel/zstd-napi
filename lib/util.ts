import { strict as assert } from 'assert';

export interface ParamMapper<T> {
  validateInput(value: unknown): value is T;
  mapValue(value: T): number;
}

export type ParamObject<M> = {
  [key in keyof M]: M[key] extends ParamMapper<infer T> ? T : never;
};

export function tsAssert(value: unknown, msg?: string | Error): asserts value {
  assert(value, msg);
}

export const mapNumber: ParamMapper<number> = {
  validateInput: (value): value is number => typeof value === 'number',
  mapValue: (value) => value,
};

export function mapEnum<
  E extends { [key in K]: number },
  K extends string = keyof E & string,
>(enumObj: E): ParamMapper<K> {
  return {
    validateInput: (value): value is K =>
      typeof value === 'string' && value in enumObj,
    mapValue: (value) => enumObj[value],
  };
}

export const mapBoolean: ParamMapper<boolean> = {
  validateInput: (value): value is boolean => typeof value === 'boolean',
  mapValue: (value) => Number(value),
};

function mapParameter<P>(
  name: string,
  mapper: ParamMapper<P>,
  value: unknown,
): number {
  if (!mapper.validateInput(value)) {
    throw new TypeError(`Invalid type for parameter: ${name}`);
  }
  return mapper.mapValue(value);
}

export function mapParameters<
  E extends { [key in K]: number },
  K extends string = keyof E & string,
>(
  paramEnum: E,
  mapper: { [key in keyof E]: ParamMapper<unknown> },
  params: Record<string, unknown>,
): Map<E[keyof E], number> {
  const result = new Map<E[keyof E], number>();
  for (const [rawKey, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (!(rawKey in mapper)) {
        throw new RangeError(`Invalid parameter name: ${rawKey}`);
      }
      const key = rawKey as K;
      result.set(paramEnum[key], mapParameter(key, mapper[key], value));
    }
  }
  return result;
}

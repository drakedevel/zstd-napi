interface ParamMapper<T> {
  validateInput(value: unknown): value is T;
  mapValue(value: T): number;
}

type ParamObject<M> = {
  [key in keyof M]?: M[key] extends ParamMapper<infer T>
    ? T | undefined
    : never;
};

type StrKeys<O> = Extract<keyof O, string>;
type OnlyKeys<O, K> = O & Record<Exclude<keyof O, K>, never>;

export const mapNumber: ParamMapper<number> = {
  validateInput: (value): value is number => typeof value === 'number',
  mapValue: (value) => value,
};

export function mapEnum<E extends Record<StrKeys<E>, number>>(
  enumObj: E,
): ParamMapper<StrKeys<E>> {
  return {
    validateInput: (value): value is StrKeys<E> =>
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
  E,
  M extends Record<StrKeys<E>, ParamMapper<unknown>>,
  P extends ParamObject<M>,
>(
  paramEnum: E,
  mapper: OnlyKeys<M, StrKeys<E>>,
  params: OnlyKeys<P, StrKeys<E>>,
): Map<E[keyof E], number> {
  const result = new Map<E[keyof E], number>();
  for (const [rawKey, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (!(rawKey in mapper)) {
        throw new RangeError(`Invalid parameter name: ${rawKey}`);
      }
      const key = rawKey as StrKeys<E>;
      result.set(paramEnum[key], mapParameter(key, mapper[key], value));
    }
  }
  return result;
}

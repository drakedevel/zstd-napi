import { mapNumber, mapParameters } from '../lib/util';

describe('mapParameters', () => {
  enum TestParameter {
    paramOne,
  }
  const goodMapper = { paramOne: mapNumber };

  it('should reject mismatched mapper objects', () => {
    mapParameters(TestParameter, goodMapper, {});

    // Extra property
    const mapperWithExtra = { ...goodMapper, paramTwo: mapNumber };
    // @ts-expect-error: should reject extra mapper
    mapParameters(TestParameter, mapperWithExtra, {});

    // Missing property
    // @ts-expect-error: should reject missing mapper
    mapParameters(TestParameter, {}, {});
  });

  it('should reject mismatched parameter objects', () => {
    // Extra property
    expect(() => {
      // @ts-expect-error: should reject extra parameter
      mapParameters(TestParameter, goodMapper, { paramTwo: 42 });
    }).toThrow();

    // Wrong property type
    expect(() => {
      // @ts-expect-error: should reject wrong parameter type
      mapParameters(TestParameter, goodMapper, { paramOne: true });
    }).toThrow();
  });
});

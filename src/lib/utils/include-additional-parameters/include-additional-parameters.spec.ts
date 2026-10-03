import { includeAdditionalParameters } from './include-additional-parameters';

describe('includeAdditionalParameters()', () => {
  it('should add the provided Parameters to the provided Object.', () => {
    const obj: NodeJS.Dict<unknown> = { foo: 'foo', bar: 'bar' };
    const augmentedObj: NodeJS.Dict<unknown> = includeAdditionalParameters(obj, { baz: 'baz' });

    expect(obj).toStrictEqual<NodeJS.Dict<unknown>>({ foo: 'foo', bar: 'bar', baz: 'baz' });
    expect(augmentedObj).toStrictEqual<NodeJS.Dict<unknown>>({ foo: 'foo', bar: 'bar', baz: 'baz' });
  });
});

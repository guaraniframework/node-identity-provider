import { Buffer } from 'buffer';

import { IdentityProviderError } from '../../errors/identity-provider.error';
import { ServerErrorError } from '../../errors/server-error/server-error.error';
import { asIdentityProviderError } from './as-identity-provider-error';

const nonIdentityProviderErrors: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  new Error('General Error.'),
];

describe('asIdentityProviderError()', () => {
  it.each(nonIdentityProviderErrors)(
    'should return a Server Error Error when the provided Error is not an Identity Provider Error.',
    (error) => {
      expect(asIdentityProviderError(error)).toStrictEqual(
        new ServerErrorError('An unexpected error occurred.', { cause: error, fatal: true }),
      );
    },
  );

  it('should return the provided Identity Provider Error.', () => {
    const error = new IdentityProviderError('custom_error', 'Custom Error Description.');
    expect(asIdentityProviderError(error)).toBe(error);
  });
});

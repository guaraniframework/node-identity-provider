import { Constructor, getContainer } from '@guarani/di';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { ClientAuthenticationName } from '../../../client-authentication/client-authentication-name.type';
import { PrivateKeyJwtClientAuthentication } from '../../../client-authentication/private-key-jwt/private-key-jwt.client-authentication';
import { CONTAINER, REVOCATION_CLIENT_AUTHENTICATION } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { RevocationEndpoint } from '../../../endpoints/revocation/revocation.endpoint';
import { RevocationValidator } from '../../../validators/revocation/revocation.validator';
import { RevocationEndpointOptions } from './revocation-endpoint.options';

const invalidClientAuthenticationMethods: any[] = [
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
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(1)],
  [() => 1],
  [{}],
  [[]],
  [''],
  ['a'],
];

describe('Revocation Endpoint Options', () => {
  let options: RevocationEndpointOptions;
  const container = getContainer(CONTAINER);

  beforeEach(() => {
    options = new RevocationEndpointOptions(container);
  });

  afterEach(() => {
    container.clear();
  });

  describe('useClientAuthenticationMethods()', () => {
    it.each(invalidClientAuthenticationMethods)(
      'should throw when the provided Client Authentication Methods is invalid.',
      (methods) => {
        expect(() => options.useClientAuthenticationMethods(methods)).toThrowWithMessage(
          TypeError,
          'The provided Client Authentication Methods is invalid.',
        );
      },
    );

    it('should register the default Client Authentication Methods in the Identity Provider Factory.', () => {
      expect(() => options.useClientAuthenticationMethods([])).not.toThrow();

      expect(options['methods']).toStrictEqual<ClientAuthenticationName[]>(['client_secret_basic']);
    });

    it('should register the provided Client Authentication Methods in the Identity Provider Factory.', () => {
      expect(() => options.useClientAuthenticationMethods(['private_key_jwt'])).not.toThrow();

      expect(options['methods']).toStrictEqual<ClientAuthenticationName[]>(['private_key_jwt']);
    });
  });

  describe('build()', () => {
    it('should register the actors of the Revocation Endpoint in the Identity Provider Factory.', () => {
      options.useClientAuthenticationMethods(['private_key_jwt']);

      expect(() => options.build()).not.toThrow();

      expect(container.isRegistered(Endpoint)).toBeTrue();
      expect(container.isRegistered<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION)).toBeTrue();
      expect(container.isRegistered(RevocationValidator)).toBeTrue();

      expect(container.get(Endpoint)).toBe(RevocationEndpoint);

      expect(
        container['registry']
          .getAll(REVOCATION_CLIENT_AUTHENTICATION)
          .map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<ClientAuthentication>[]>(expect.arrayContaining([PrivateKeyJwtClientAuthentication]));
    });
  });
});

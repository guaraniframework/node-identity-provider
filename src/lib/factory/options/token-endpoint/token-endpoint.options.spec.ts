import { Constructor, getContainer } from '@guarani/di';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { ClientAuthenticationName } from '../../../client-authentication/client-authentication-name.type';
import { PrivateKeyJwtClientAuthentication } from '../../../client-authentication/private-key-jwt/private-key-jwt.client-authentication';
import { CONTAINER, TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { TokenEndpoint } from '../../../endpoints/token/token.endpoint';
import { AuthorizationCodeGrantType } from '../../../grant-types/authorization-code/authorization-code.grant-type';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { RefreshTokenGrantType } from '../../../grant-types/refresh-token/refresh-token.grant-type';
import { AuthorizationCodeTokenValidator } from '../../../validators/token/authorization-code/authorization-code.token.validator';
import { RefreshTokenTokenValidator } from '../../../validators/token/refresh-token/refresh-token.token.validator';
import { TokenValidator } from '../../../validators/token/token.validator';
import { TokenEndpointOptions } from './token-endpoint.options';

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

const invalidGrantTypes: any[] = [
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

describe('Token Endpoint Options', () => {
  let options: TokenEndpointOptions;
  const container = getContainer(CONTAINER);

  beforeEach(() => {
    options = new TokenEndpointOptions(container);
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

  describe('useGrantTypes()', () => {
    it.each(invalidGrantTypes)('should throw when the provided Grant Types is invalid.', (grantTypes) => {
      expect(() => options.useGrantTypes(grantTypes)).toThrowWithMessage(
        TypeError,
        'The provided Grant Types is invalid.',
      );
    });

    it('should register the default Grant Types in the Identity Provider Factory.', () => {
      expect(() => options.useGrantTypes([])).not.toThrow();

      expect(options['grantTypes']).toStrictEqual<GrantTypeName[]>(['authorization_code']);
    });

    it('should register the provided Grant Types in the Identity Provider Factory.', () => {
      expect(() => options.useGrantTypes(['refresh_token'])).not.toThrow();

      expect(options['grantTypes']).toStrictEqual<GrantTypeName[]>(['refresh_token']);
    });
  });

  describe('build()', () => {
    it('should throw when not registering a required Grant Type.', () => {
      options.useGrantTypes(['refresh_token']);

      expect(() => options.build()).toThrowWithMessage(TypeError, 'Missing required Grant Type "authorization_code".');
    });

    it('should register the actors of the Token Endpoint in the Identity Provider Factory.', () => {
      options
        .useClientAuthenticationMethods(['private_key_jwt'])
        .useGrantTypes(['authorization_code', 'refresh_token']);

      expect(() => options.build()).not.toThrow();

      expect(container.isRegistered(Endpoint)).toBeTrue();
      expect(container.isRegistered<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION)).toBeTrue();
      expect(container.isRegistered(GrantType)).toBeTrue();
      expect(container.isRegistered(TokenValidator)).toBeTrue();

      expect(container.get(Endpoint)).toBe(TokenEndpoint);

      expect(
        container['registry']
          .getAll(TOKEN_CLIENT_AUTHENTICATION)
          .map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<ClientAuthentication>[]>(expect.arrayContaining([PrivateKeyJwtClientAuthentication]));

      expect(
        container['registry'].getAll(GrantType).map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<GrantType>[]>([AuthorizationCodeGrantType, RefreshTokenGrantType]);

      expect(
        container['registry'].getAll(TokenValidator).map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<TokenValidator>[]>([AuthorizationCodeTokenValidator, RefreshTokenTokenValidator]);
    });
  });
});

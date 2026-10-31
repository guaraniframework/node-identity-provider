import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CONTAINER, TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { PasswordTokenContext } from '../../../context/token/password/password.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { User } from '../../../entities/user';
import { AccessDeniedError } from '../../../errors/access-denied/access-denied.error';
import { InvalidGrantError } from '../../../errors/invalid-grant/invalid-grant.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { InvalidScopeError } from '../../../errors/invalid-scope/invalid-scope.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { HttpRequestMethod } from '../../../http/request/http-request-method.enum';
import { Logger } from '../../../loggers/logger';
import { PasswordTokenRequest } from '../../../requests/token/password/password.token-request';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { TokenValidator } from '../token.validator';
import { PasswordTokenValidator } from './password.token.validator';

jest.mock('../../../client-authentication/client-authentication');
jest.mock('../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../loggers/logger');

const invalidUsernames: any[] = [undefined, ''];
const invalidPasswords: any[] = [undefined, ''];

describe('Resource Owner Password Credentials Token Validator', () => {
  let validator: PasswordTokenValidator;
  const container = getContainer(CONTAINER);

  let superValidateSpy: jest.SpyInstance;

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findUserByResourceOwnerCredentials: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), { name: 'password' }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  const scopes: Scope[] = ['foo', 'bar', 'baz'].map((scope) =>
    Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    scopes,
    grantTypes: ['password'],
  });

  const user: User = Object.assign<User, Partial<User>>(new User(), {
    id: 'user_id',
    email: 'user@email.com',
    password: 'secretpassword',
  });

  beforeEach(() => {
    superValidateSpy = jest.spyOn(TokenValidator.prototype, 'validate');

    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(GrantType).toValue(grantTypeMock);
    container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(PasswordTokenValidator).toSelf().asSingleton();

    validator = container.resolve(PasswordTokenValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "password" as its value.', () => {
      expect(validator.name).toBe<GrantTypeName>('password');
    });
  });

  describe('constructor', () => {
    it('should throw when not implementing the method DataAccess.findUserByResourceOwnerCredentials().', () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {}),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind(ScopeHandler).toValue(scopeHandlerMock);
      container.bind(GrantType).toValue(grantTypeMock);
      container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(PasswordTokenValidator).toSelf().asSingleton();

      const error = new TypeError(
        'Missing implementation of required method "DataAccess.findUserByResourceOwnerCredentials".',
      );
      expect(() => container.resolve(PasswordTokenValidator)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.fatal).toHaveBeenCalledExactlyOnceWith(
        '[PasswordTokenValidator] Missing implementation of required method "DataAccess.findUserByResourceOwnerCredentials"',
        'bc3a9749-5315-408f-a240-8e961480aa23',
        null,
        error,
      );
    });
  });

  describe('validate()', () => {
    let parameters!: PasswordTokenRequest;

    const requestFactory = (data: Partial<PasswordTokenRequest> = {}): HttpRequest => {
      removeNullishValues<PasswordTokenRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters)),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: addParametersToUrl('https://provider.example.com/oidc/token', parameters),
      });
    };

    beforeEach(() => {
      parameters = { grant_type: 'password', username: 'user@email.com', password: 'secretpassword', scope: 'foo bar' };
    });

    it.each(invalidUsernames)('should throw when the provided parameter "username" is invalid.', async (username) => {
      const request = requestFactory({ username });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "username".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[PasswordTokenValidator] Invalid parameter "username"',
        '2963042c-77f5-4704-aeff-22f2618280b3',
        { parameters },
        error,
      );
    });

    it.each(invalidPasswords)('should throw when the provided parameter "password" is invalid.', async (password) => {
      const request = requestFactory({ password });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "password".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[PasswordTokenValidator] Invalid parameter "password"',
        '55595e1d-8a32-43f4-8a02-ca2e72196b69',
        { parameters },
        error,
      );
    });

    it('should throw when no User is found.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findUserByResourceOwnerCredentials!.mockResolvedValueOnce(null);

      const error = new InvalidGrantError('Invalid Resource Owner Credentials.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[PasswordTokenValidator] Invalid Resource Owner Credentials',
        '2bb8e2bc-644f-480b-83a7-812a05c099a1',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "scope" is invalid.', async () => {
      const request = requestFactory({ scope: '' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findUserByResourceOwnerCredentials!.mockResolvedValueOnce(user);

      const error = new InvalidRequestError('Invalid parameter "scope".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[PasswordTokenValidator] Invalid parameter "scope"',
        'd9fa30eb-68a0-452e-820a-e09c12ca1985',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the Client requests an unsupported Scope.', async () => {
      const request = requestFactory({ scope: 'foo bar unknown' });

      const error = new InvalidScopeError('Unsupported Scope "unknown".');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findUserByResourceOwnerCredentials!.mockResolvedValueOnce(user);
      scopeHandlerMock.checkRequestedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidScopeError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it("should throw when the Client requests a Scope it's not allowed to.", async () => {
      const request = requestFactory({ scope: 'foo bar qux' });

      const error = new AccessDeniedError('The Client is not allowed to request the Scope "qux".');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findUserByResourceOwnerCredentials!.mockResolvedValueOnce(user);
      scopeHandlerMock.getAllowedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it("should return a Resource Owner Password Credentials Token Context with the Client's default Scopes.", async () => {
      const request = requestFactory({ scope: undefined! });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findUserByResourceOwnerCredentials!.mockResolvedValueOnce(user);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(client.scopes);

      await expect(validator.validate(request)).resolves.toStrictEqual<PasswordTokenContext>(
        expect.objectContaining<PasswordTokenContext>({
          parameters,
          grantType: grantTypeMock,
          client,
          user,
          scopes,
        }),
      );
    });

    it('should return a Resource Owner Password Credentials Token Context with the requested Scopes.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findUserByResourceOwnerCredentials!.mockResolvedValueOnce(user);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(
        scopes.filter((scope) => parameters.scope!.includes(scope.name)),
      );

      await expect(validator.validate(request)).resolves.toStrictEqual<PasswordTokenContext>(
        expect.objectContaining<PasswordTokenContext>({
          parameters,
          grantType: grantTypeMock,
          client,
          user,
          scopes: scopes.filter((scope) => scope.name !== 'baz'),
        }),
      );
    });
  });
});

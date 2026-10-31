import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CONTAINER, TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { RefreshTokenTokenContext } from '../../../context/token/refresh-token/refresh-token.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { RefreshToken } from '../../../entities/refresh-token';
import { Scope } from '../../../entities/scope';
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
import { RefreshTokenTokenRequest } from '../../../requests/token/refresh-token/refresh-token.token-request';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { TokenValidator } from '../token.validator';
import { RefreshTokenTokenValidator } from './refresh-token.token.validator';

jest.mock('../../../client-authentication/client-authentication');
jest.mock('../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../loggers/logger');

const invalidRefreshTokens: any[] = [undefined, ''];

describe('Refresh Token Token Validator', () => {
  let validator: RefreshTokenTokenValidator;
  const container = getContainer(CONTAINER);

  let superValidateSpy: jest.SpyInstance;

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findRefreshTokenById: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), { name: 'refresh_token' }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  beforeEach(() => {
    superValidateSpy = jest.spyOn(TokenValidator.prototype, 'validate');

    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(GrantType).toValue(grantTypeMock);
    container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(RefreshTokenTokenValidator).toSelf().asSingleton();

    validator = container.resolve(RefreshTokenTokenValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "refresh_token" as its value.', () => {
      expect(validator.name).toBe<GrantTypeName>('refresh_token');
    });
  });

  describe('constructor', () => {
    it('should throw when not implementing the method DataAccess.findRefreshTokenById().', () => {
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
      container.bind(RefreshTokenTokenValidator).toSelf().asSingleton();

      const error = new TypeError('Missing implementation of required method "DataAccess.findRefreshTokenById".');
      expect(() => container.resolve(RefreshTokenTokenValidator)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.fatal).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] Missing implementation of required method "DataAccess.findRefreshTokenById"',
        'e72b3d93-76b2-4de6-8068-7e58a254d7d1',
        null,
        error,
      );
    });
  });

  describe('validate()', () => {
    let parameters!: RefreshTokenTokenRequest;

    let scopes!: Scope[];
    let client!: Client;
    let refreshToken!: RefreshToken;

    const requestFactory = (data: Partial<RefreshTokenTokenRequest> = {}): HttpRequest => {
      removeNullishValues<RefreshTokenTokenRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters)),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: addParametersToUrl('https://provider.example.com/oidc/token', parameters),
      });
    };

    beforeEach(() => {
      parameters = { grant_type: 'refresh_token', refresh_token: 'refresh_token', scope: 'foo bar' };

      scopes = ['foo', 'bar', 'baz'].map((scope) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }));

      client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'client_id',
        scopes,
        grantTypes: ['refresh_token'],
      });

      refreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
        id: 'refresh_token',
        scopes,
        client,
      });
    });

    it.each(invalidRefreshTokens)(
      'should throw when the provided parameter "refresh_token" is invalid.',
      async (refreshToken) => {
        const request = requestFactory({ refresh_token: refreshToken });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

        const error = new InvalidRequestError('Invalid parameter "refresh_token".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[RefreshTokenTokenValidator] Invalid parameter "refresh_token"',
          'f81beada-6951-4a17-a92c-279f3c18d1a0',
          { parameters },
          error,
        );
      },
    );

    it('should throw when no Refresh Token is found.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(null);

      const error = new InvalidGrantError('Invalid Refresh Token.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] Invalid Refresh Token',
        'e308cf51-c9fb-461e-bcd6-3e91ff0b395e',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "scope" is invalid.', async () => {
      const request = requestFactory({ scope: '' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);

      const error = new InvalidRequestError('Invalid parameter "scope".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] Invalid parameter "scope"',
        '104ded58-99fd-4791-91cb-a65ae8fc166b',
        { parameters, refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );
    });

    it('should throw when the Client requests an unsupported Scope.', async () => {
      const request = requestFactory({ scope: 'foo bar unknown' });

      const error = new InvalidScopeError('Unsupported Scope "unknown".');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.checkRequestedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidScopeError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it("should throw when the Client requests a Scope it's not allowed to.", async () => {
      const request = requestFactory({ scope: 'foo bar qux' });

      const error = new AccessDeniedError('The Client is not allowed to request the Scope "qux".');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it('should throw when the Client requests a Scope that was not previously granted.', async () => {
      const request = requestFactory({ scope: 'foo bar baz' });

      const refreshToken: RefreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
        id: 'refresh_token',
        scopes: scopes.filter((scope) => scope.name !== 'baz'),
      });

      const error = new InvalidGrantError('The Scope "baz" was not previously granted.');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(scopes);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] The Scope "baz" was not previously granted',
        '83f97acd-b875-481f-b6a1-5b9ce33ec1ab',
        { parameters, refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );
    });

    it('should throw on a mismatching Client Identifier.', async () => {
      const request = requestFactory();

      const refreshTokenClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'another_client_id',
        redirectUris: [new URL('https://client.example.com/oidc/callback')],
        grantTypes: ['refresh_token'],
      });

      Reflect.set(refreshToken, 'client', refreshTokenClient);

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(scopes);

      const error = new InvalidGrantError('Invalid Refresh Token.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] Mismatching Client Identifier',
        '84ca7dde-d9aa-4169-aa37-ea758facb3c4',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );
    });

    it('should throw when the Refresh Token is not yet valid.', async () => {
      const request = requestFactory();

      Reflect.set(refreshToken, 'validAfter', new Date(Date.now() + 3600000));

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(scopes);

      const error = new InvalidGrantError('Invalid Refresh Token.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] Refresh Token not yet valid',
        '9f576636-3175-4b0b-94cd-b58a8a46f471',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );
    });

    it('should throw when the Refresh Token is expired.', async () => {
      const request = requestFactory();

      Reflect.set(refreshToken, 'expiresAt', new Date(Date.now() - 3600000));

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(scopes);

      const error = new InvalidGrantError('Invalid Refresh Token.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] Expired Refresh Token',
        '8993e731-ab0f-4e95-93e4-e98c9f3ece55',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );
    });

    it('should throw when the Refresh Token is revoked.', async () => {
      const request = requestFactory();

      Reflect.set(refreshToken, 'revokedAt', new Date(Date.now() - 3600000));

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(scopes);

      const error = new InvalidGrantError('Invalid Refresh Token.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenTokenValidator] Revoked Refresh Token',
        'b4a9ed5f-b13c-49cc-abf3-2ca0b0a64cd0',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );
    });

    it("should return a Refresh Token Token Context with the Refresh Token's default Scopes.", async () => {
      const request = requestFactory({ scope: undefined! });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(client.scopes);

      await expect(validator.validate(request)).resolves.toStrictEqual<RefreshTokenTokenContext>(
        expect.objectContaining<RefreshTokenTokenContext>({
          parameters,
          grantType: grantTypeMock,
          client,
          refreshToken,
          scopes,
        }),
      );
    });

    it('should return a Refresh Token Token Context with the requested Scopes.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(
        scopes.filter((scope) => parameters.scope!.includes(scope.name)),
      );

      await expect(validator.validate(request)).resolves.toStrictEqual<RefreshTokenTokenContext>(
        expect.objectContaining<RefreshTokenTokenContext>({
          parameters,
          grantType: grantTypeMock,
          client,
          refreshToken,
          scopes: scopes.filter((scope) => scope.name !== 'baz'),
        }),
      );
    });
  });
});

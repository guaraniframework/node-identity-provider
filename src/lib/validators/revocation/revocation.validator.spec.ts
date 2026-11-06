import { Buffer } from 'buffer';
import qs from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import { CONTAINER, REVOCATION_CLIENT_AUTHENTICATION } from '../../constants';
import { RevocationContext } from '../../context/revocation/revocation-context';
import { DataAccess } from '../../data-access/data-access';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { RefreshToken } from '../../entities/refresh-token';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { MethodNotAllowedError } from '../../errors/method-not-allowed/method-not-allowed.error';
import { UnsupportedTokenTypeError } from '../../errors/unsupported-token-type/unsupported-token-type.error';
import { ClientAuthenticationHandler } from '../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../loggers/logger';
import { RevocationRequest } from '../../requests/revocation/revocation-request';
import { TokenTypeHint } from '../../types/token-type-hint.type';
import { RevocationValidator } from './revocation.validator';

jest.mock('../../client-authentication/client-authentication');
jest.mock('../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../loggers/logger');

const invalidHttpRequestMethods: HttpRequestMethod[] = [
  HttpRequestMethod.DELETE,
  HttpRequestMethod.GET,
  HttpRequestMethod.PUT,
];

const invalidTokens: any[] = [undefined, ''];

describe('Revocation Validation', () => {
  let validator: RevocationValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findAccessTokenById: jest.fn(),
      findRefreshTokenById: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);
  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(RevocationValidator).toSelf().asSingleton();

    validator = container.resolve(RevocationValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('endpoint', () => {
    it('should have "revocation" as its value.', () => {
      expect(validator.endpoint).toBe<EndpointName>('revocation');
    });
  });

  describe('supportedHttpRequestMethods', () => {
    it('should have ["POST"] as its value.', () => {
      expect(validator.supportedHttpRequestMethods).toStrictEqual<HttpRequestMethod[]>([HttpRequestMethod.POST]);
    });
  });

  describe('validate()', () => {
    let parameters: RevocationRequest;

    const clientlessAccessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
      id: 'access_token_id',
      client: null,
    });

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });

    const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
      id: 'access_token_id',
      client,
    });

    const refreshToken: RefreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
      id: 'refresh_token_id',
      client,
    });

    const requestFactory = (data: Partial<RevocationRequest> = {}): HttpRequest => {
      removeNullishValues<RevocationRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(qs.stringify(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/revocation'),
      });
    };

    beforeEach(() => {
      parameters = { token: 'token_id' };
    });

    it.each(invalidHttpRequestMethods)(
      'should throw when the requested Http Request Method is invalid.',
      async (method) => {
        const request = new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method,
          url: new URL('https://provider.example.com/oidc/revocation'),
        });

        const error = new MethodNotAllowedError(
          `The Revocation Endpoint does not support the Http Request Method "${method}".`,
        );

        await expect(validator.validate(request)).rejects.toThrowWithMessage(MethodNotAllowedError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          `[RevocationValidator] The Revocation Endpoint does not support the Http Request Method "${method}"`,
          '817c032b-b400-43cd-8c7a-666ab335236c',
          { request },
          error,
        );
      },
    );

    it('should throw when the Client fails to authenticate.', async () => {
      const request = requestFactory();

      const error = new InvalidClientError('Failed to authenticate the Client.');

      clientAuthenticationHandlerMock.authenticate.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidClientError, error.description);

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it.each(invalidTokens)('should throw when the provided parameter "token" is invalid.', async (token) => {
      const request = requestFactory({ token });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "token".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RevocationValidator] Invalid parameter "token"',
        '77fb891e-04f9-4ad2-9c72-ab0deeda123b',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "token_type_hint" is invalid.', async () => {
      const request = requestFactory({ token_type_hint: '' as TokenTypeHint });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "token_type_hint".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RevocationValidator] Invalid parameter "token_type_hint"',
        'd1dc5d07-1b9b-46fc-97e4-d302925fd0b5',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "token_type_hint" is unsupported.', async () => {
      const request = requestFactory({ token_type_hint: 'unknown' as TokenTypeHint });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new UnsupportedTokenTypeError('Unsupported Token Type Hint "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(
        UnsupportedTokenTypeError,
        error.description,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RevocationValidator] Unsupported Token Type Hint "unknown"',
        'b30a3503-5f84-4959-8a37-ea9b4accf3dc',
        { parameters },
        error,
      );
    });

    it('should throw when passing a Token Type Hint "refresh_token" and the Identity Provider does not support Refresh Tokens.', async () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          findAccessTokenById: jest.fn(),
        }),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(RevocationValidator).toSelf().asSingleton();

      validator = container.resolve(RevocationValidator);

      const request = requestFactory({ token_type_hint: 'refresh_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);

      const error = new UnsupportedTokenTypeError('Unsupported Token Type Hint "refresh_token".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(
        UnsupportedTokenTypeError,
        error.description,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[RevocationValidator] Unsupported Token Type Hint "refresh_token"',
        'b30a3503-5f84-4959-8a37-ea9b4accf3dc',
        { parameters },
        error,
      );
    });

    it('should return a Revocation Context with a null Token when passing a Token Type Hint "refresh_token" for an unknown Token.', async () => {
      const request = requestFactory({ token_type_hint: 'refresh_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(null);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );
    });

    it('should return a Revocation Context with a null Token when passing a Token Type Hint "access_token" and the Identity Provider does not support Refresh Tokens.', async () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          findAccessTokenById: jest.fn(),
        }),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(RevocationValidator).toSelf().asSingleton();

      validator = container.resolve(RevocationValidator);

      const request = requestFactory({ token_type_hint: 'access_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );
    });

    it('should return a Revocation Context with a null Token when passing a Token Type Hint "access_token" for an unknown Token.', async () => {
      const request = requestFactory({ token_type_hint: 'access_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(null);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );
    });

    it('should return a Revocation Context with a null Token when the Identity Provider does not support Refresh Tokens.', async () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          findAccessTokenById: jest.fn(),
        }),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(RevocationValidator).toSelf().asSingleton();

      validator = container.resolve(RevocationValidator);

      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );
    });

    it('should return a Revocation Context with a null Token when failing to find a Token.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(null);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );
    });

    it('should return a Revocation Context with a null Token when passing a Token Type Hint "refresh_token" and the Access Token has no Client.', async () => {
      const request = requestFactory({ token: 'access_token_id', token_type_hint: 'refresh_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(null);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(clientlessAccessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );
    });

    it('should return a Revocation Context with a null Token when passing a Token Type Hint "access_token", the Identity Provider does not support Refresh Tokens, and the Access Token has no Client.', async () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          findAccessTokenById: jest.fn(),
        }),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(RevocationValidator).toSelf().asSingleton();

      validator = container.resolve(RevocationValidator);

      const request = requestFactory({ token: 'access_token_id', token_type_hint: 'access_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(clientlessAccessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );
    });

    it('should return a Revocation Context with a null Token when the Access Token has no Client.', async () => {
      const request = requestFactory({ token: 'access_token_id' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(clientlessAccessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: null }),
      );

      expect(dataAccessMock.findRefreshTokenById).not.toHaveBeenCalled();
    });

    it('should return a Revocation Context with a Refresh Token when passing a Token Type Hint "refresh_token".', async () => {
      const request = requestFactory({ token: 'refresh_token_id', token_type_hint: 'refresh_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: refreshToken }),
      );

      expect(dataAccessMock.findAccessTokenById).not.toHaveBeenCalled();
    });

    it('should return a Revocation Context with an Access Token when passing a Token Type Hint "refresh_token".', async () => {
      const request = requestFactory({ token: 'access_token_id', token_type_hint: 'refresh_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(null);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(accessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: accessToken }),
      );
    });

    it('should return a Revocation Context with an Access Token when passing a Token Type Hint "access_token" and the Identity Provider does not support Refresh Tokens.', async () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          findAccessTokenById: jest.fn(),
        }),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(RevocationValidator).toSelf().asSingleton();

      validator = container.resolve(RevocationValidator);

      const request = requestFactory({ token: 'access_token_id', token_type_hint: 'access_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(accessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: accessToken }),
      );
    });

    it('should return a Revocation Context with an Access Token when passing a Token Type Hint "access_token".', async () => {
      const request = requestFactory({ token: 'access_token_id', token_type_hint: 'access_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(accessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: accessToken }),
      );

      expect(dataAccessMock.findRefreshTokenById).not.toHaveBeenCalled();
    });

    it('should return a Revocation Context with a Refresh Token when passing a Token Type Hint "access_token".', async () => {
      const request = requestFactory({ token: 'refresh_token_id', token_type_hint: 'access_token' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: refreshToken }),
      );
    });

    it('should return a Revocation Context with an Access Token when the Identity Provider does not support Refresh Tokens.', async () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          findAccessTokenById: jest.fn(),
        }),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(RevocationValidator).toSelf().asSingleton();

      validator = container.resolve(RevocationValidator);

      const request = requestFactory({ token: 'access_token_id' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(accessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: accessToken }),
      );
    });

    it('should return a Revocation Context with an Access Token.', async () => {
      const request = requestFactory({ token: 'access_token_id' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(accessToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: accessToken }),
      );

      expect(dataAccessMock.findRefreshTokenById).not.toHaveBeenCalled();
    });

    it('should return a Revocation Context with a Refresh Token.', async () => {
      const request = requestFactory({ token: 'refresh_token_id' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAccessTokenById.mockResolvedValueOnce(null);
      dataAccessMock.findRefreshTokenById!.mockResolvedValueOnce(refreshToken);

      await expect(validator.validate(request)).resolves.toStrictEqual<RevocationContext>(
        expect.objectContaining<RevocationContext>({ parameters, client, token: refreshToken }),
      );
    });
  });
});

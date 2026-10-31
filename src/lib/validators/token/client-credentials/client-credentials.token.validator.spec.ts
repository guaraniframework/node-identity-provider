import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CONTAINER, TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { ClientCredentialsTokenContext } from '../../../context/token/client-credentials/client-credentials.token-context';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { AccessDeniedError } from '../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { InvalidScopeError } from '../../../errors/invalid-scope/invalid-scope.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { HttpRequestMethod } from '../../../http/request/http-request-method.enum';
import { Logger } from '../../../loggers/logger';
import { ClientCredentialsTokenRequest } from '../../../requests/token/client-credentials/client-credentials.token-request';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { TokenValidator } from '../token.validator';
import { ClientCredentialsTokenValidator } from './client-credentials.token.validator';

jest.mock('../../../client-authentication/client-authentication');
jest.mock('../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../loggers/logger');

describe('Client Credentials Token Validator', () => {
  let validator: ClientCredentialsTokenValidator;
  const container = getContainer(CONTAINER);

  let superValidateSpy: jest.SpyInstance;

  const loggerMock = jest.mocked(Logger.prototype);
  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), {
      name: 'client_credentials',
    }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  const scopes: Scope[] = ['foo', 'bar', 'baz'].map((scope) =>
    Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    scopes,
    grantTypes: ['client_credentials'],
  });

  beforeEach(() => {
    superValidateSpy = jest.spyOn(TokenValidator.prototype, 'validate');

    container.bind(Logger).toValue(loggerMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(GrantType).toValue(grantTypeMock);
    container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(ClientCredentialsTokenValidator).toSelf().asSingleton();

    validator = container.resolve(ClientCredentialsTokenValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "client_credentials" as its value.', () => {
      expect(validator.name).toBe<GrantTypeName>('client_credentials');
    });
  });

  describe('validate()', () => {
    let parameters!: ClientCredentialsTokenRequest;

    const requestFactory = (data: Partial<ClientCredentialsTokenRequest> = {}): HttpRequest => {
      removeNullishValues<ClientCredentialsTokenRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters)),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: addParametersToUrl('https://provider.example.com/oidc/token', parameters),
      });
    };

    beforeEach(() => {
      parameters = { grant_type: 'client_credentials', scope: 'foo bar' };
    });

    it('should throw when the provided parameter "scope" is invalid.', async () => {
      const request = requestFactory({ scope: '' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "scope".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientCredentialsTokenValidator] Invalid parameter "scope"',
        'b1a3f287-6d9e-4c3a-afca-8d0ad49a0a02',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the Client requests an unsupported Scope.', async () => {
      const request = requestFactory({ scope: 'foo bar unknown' });

      const error = new InvalidScopeError('Unsupported Scope "unknown".');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      scopeHandlerMock.checkRequestedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidScopeError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it("should throw when the Client requests a Scope it's not allowed to.", async () => {
      const request = requestFactory({ scope: 'foo bar qux' });

      const error = new AccessDeniedError('The Client is not allowed to request the Scope "qux".');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it("should return a Client Credentials Token Context with the Client's default Scopes.", async () => {
      const request = requestFactory({ scope: undefined! });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(client.scopes);

      await expect(validator.validate(request)).resolves.toStrictEqual<ClientCredentialsTokenContext>(
        expect.objectContaining<ClientCredentialsTokenContext>({
          parameters,
          grantType: grantTypeMock,
          client,
          scopes,
        }),
      );
    });

    it('should return a Client Credentials Token Context with the requested Scopes.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(
        scopes.filter((scope) => parameters.scope!.includes(scope.name)),
      );

      await expect(validator.validate(request)).resolves.toStrictEqual<ClientCredentialsTokenContext>(
        expect.objectContaining<ClientCredentialsTokenContext>({
          parameters,
          grantType: grantTypeMock,
          client,
          scopes: scopes.filter((scope) => scope.name !== 'baz'),
        }),
      );
    });
  });
});

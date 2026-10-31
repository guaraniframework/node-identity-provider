import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import { CONTAINER, TOKEN_CLIENT_AUTHENTICATION } from '../../constants';
import { TokenContext } from '../../context/token/token-context';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { MethodNotAllowedError } from '../../errors/method-not-allowed/method-not-allowed.error';
import { UnauthorizedClientError } from '../../errors/unauthorized-client/unauthorized-client.error';
import { GrantType } from '../../grant-types/grant-type';
import { GrantTypeName } from '../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../loggers/logger';
import { TokenRequest } from '../../requests/token/token-request';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { TokenValidator } from './token.validator';

jest.mock('../../client-authentication/client-authentication');
jest.mock('../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../loggers/logger');

@Injectable()
class CustomTokenValidator extends TokenValidator {
  public readonly name: GrantTypeName = 'authorization_code';
  public constructor(
    logger: Logger,
    clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(GrantType) grantTypes: GrantType[],
    @InjectAll(TOKEN_CLIENT_AUTHENTICATION) clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, grantTypes, clientAuthenticationMethods);
  }
}

const invalidHttpRequestMethods: HttpRequestMethod[] = [
  HttpRequestMethod.DELETE,
  HttpRequestMethod.GET,
  HttpRequestMethod.PUT,
];

describe('Token Validator', () => {
  let validator: TokenValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), {
      name: 'authorization_code',
    }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(GrantType).toValue(grantTypeMock);
    container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(TokenValidator).toClass(CustomTokenValidator).asSingleton();

    validator = container.resolve(TokenValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('endpoint', () => {
    it('should have "token" as its value.', () => {
      expect(validator.endpoint).toBe<EndpointName>('token');
    });
  });

  describe('supportedHttpRequestMethods', () => {
    it('should have ["POST"] as its value.', () => {
      expect(validator.supportedHttpRequestMethods).toStrictEqual<HttpRequestMethod[]>([HttpRequestMethod.POST]);
    });
  });

  describe('validate()', () => {
    let parameters: TokenRequest;

    const requestFactory = (data: Partial<TokenRequest> = {}): HttpRequest => {
      removeNullishValues<TokenRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/token'),
      });
    };

    beforeEach(() => {
      parameters = { grant_type: 'authorization_code' };
    });

    it.each(invalidHttpRequestMethods)(
      'should throw when the requested Http Request Method is invalid.',
      async (method) => {
        const request = new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method,
          url: addParametersToUrl('https://provider.example.com/oidc/token', parameters),
        });

        const error = new MethodNotAllowedError(
          `The Token Endpoint does not support the Http Request Method "${method}".`,
        );

        await expect(validator.validate(request)).rejects.toThrowWithMessage(MethodNotAllowedError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          `[CustomTokenValidator] The Token Endpoint does not support the Http Request Method "${method}"`,
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

    it('should throw when the Client is not allowed to use the requested Response Type.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'client_id',
        grantTypes: ['client_credentials'],
      });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new UnauthorizedClientError(
        'The Client is not allowed to request the Grant Type "authorization_code".',
      );

      await expect(validator.validate(request)).rejects.toThrowWithMessage(UnauthorizedClientError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomTokenValidator] The Client is not allowed to request the Grant Type "authorization_code"',
        'dba5311f-567f-4934-bd2b-8ae387783cb7',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should return a Token Context.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'client_id',
        grantTypes: ['authorization_code'],
      });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      await expect(validator.validate(request)).resolves.toStrictEqual<TokenContext>(
        expect.objectContaining<TokenContext>({ parameters, grantType: grantTypeMock, client }),
      );
    });
  });
});

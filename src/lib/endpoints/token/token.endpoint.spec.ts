import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify, removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../constants';
import { TokenContext } from '../../context/token/token-context';
import { Client } from '../../entities/client';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedGrantTypeError } from '../../errors/unsupported-grant-type/unsupported-grant-type.error';
import { GrantType } from '../../grant-types/grant-type';
import { GrantTypeName } from '../../grant-types/grant-type-name.type';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { HttpRoute } from '../../http/route/http-route';
import { Logger } from '../../loggers/logger';
import { TokenRequest } from '../../requests/token/token-request';
import { TokenResponse } from '../../responses/token/token-response';
import { TokenValidator } from '../../validators/token/token.validator';
import { EndpointName } from '../endpoint-name.type';
import { TokenEndpoint } from './token.endpoint';

jest.mock('../../loggers/logger');
jest.mock('../../validators/token/token.validator');

const invalidGrantTypes: any[] = [undefined, ''];

describe('Token Endpoint', () => {
  let endpoint: TokenEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const validatorMock = jest.mocked<TokenValidator>(
    Object.assign<TokenValidator, Partial<TokenValidator>>(Reflect.construct(TokenValidator, []), {
      name: 'authorization_code',
      validate: jest.fn(),
    }),
  );

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), { handle: jest.fn() }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(TokenValidator).toValue(validatorMock);
    container.bind(TokenEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(TokenEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "token" as its value.', () => {
      expect(endpoint.name).toBe<EndpointName>('token');
    });
  });

  describe('path', () => {
    it('should have "/oidc/token" as its value.', () => {
      expect(endpoint.path).toBe('/oidc/token');
    });
  });

  describe('routes', () => {
    it('should have a POST route as its value.', () => {
      expect(endpoint.routes).toStrictEqual<HttpRoute[]>([
        { method: HttpRequestMethod.POST, handler: endpoint.handle },
      ]);
    });
  });

  describe('headers', () => {
    it('should have a default "headers" object for the Http Response.', () => {
      expect(endpoint['headers']).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
      });
    });
  });

  describe('handle()', () => {
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

    it.each(invalidGrantTypes)(
      'should return an Error Response when the provided parameter "grant_type" is invalid.',
      async (grantType) => {
        const request = requestFactory({ grant_type: grantType });

        const error = new InvalidRequestError('Invalid parameter "grant_type".');
        const response = await endpoint.handle(request);

        expect(response.status).toBe(error.status);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
          ...error.headers,
        });

        expect(response.body).toStrictEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[TokenEndpoint] Invalid parameter "grant_type"',
          '8c9df96c-5d27-4ab8-b484-61e4c6f934c7',
          { parameters },
          error,
        );
      },
    );

    it('should return an Error Response when the provided parameter "grant_type" is unsupported.', async () => {
      const request = requestFactory({ grant_type: 'unknown' as GrantTypeName });

      const error = new UnsupportedGrantTypeError('Unsupported Grant Type "unknown".');
      const response = await endpoint.handle(request);

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
        ...error.headers,
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[TokenEndpoint] Unsupported Grant Type "unknown"',
        '00232cfe-e92d-487c-b313-64c1dc2f71cf',
        { parameters },
        error,
      );
    });

    it('should return a Token Response.', async () => {
      const request = requestFactory();

      const context: TokenContext = {
        parameters,
        grantType: grantTypeMock,
        client,
      };

      const tokenResponse: TokenResponse = {
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'foo bar baz',
      };

      validatorMock.validate.mockResolvedValueOnce(context);
      grantTypeMock.handle.mockResolvedValueOnce(tokenResponse);

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(tokenResponse), 'utf8'));
    });
  });
});

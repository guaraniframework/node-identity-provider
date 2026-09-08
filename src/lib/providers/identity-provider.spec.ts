import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { Endpoint } from '../endpoints/endpoint';
import { HttpRequest } from '../http/request/http-request';
import { HttpResponse } from '../http/response/http-response';
import { Logger } from '../logger/logger';
import { CONTAINER } from '../metadata/container.token';
import { IdentityProvider } from './identity-provider';

jest.mock('../logger/logger');

const invalidEndpoints: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
];

const invalidHttpRequests: any[] = [
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
];

describe('Identity Provider', () => {
  let provider: IdentityProvider;
  let request: HttpRequest;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const endpointMocks = [
    jest.mocked(
      Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
        name: 'foo' as any,
        handle: jest.fn(),
      }),
    ),
    jest.mocked<Endpoint>(
      Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
        name: 'bar' as any,
        handle: jest.fn(),
      }),
    ),
  ];

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    endpointMocks.forEach((endpointMock) => container.bind(Endpoint).toValue(endpointMock));
    container.bind(IdentityProvider).toSelf().asSingleton();

    provider = container.resolve(IdentityProvider);

    request = new HttpRequest({
      body: Buffer.alloc(0),
      cookies: {},
      headers: {},
      method: 'GET',
      url: new URL('http://idp.example.com/oidc/token'),
    });
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('endpoint()', () => {
    it.each(invalidEndpoints)('should throw when the provided Endpoint Name is invalid.', async (endpoint) => {
      const error = new TypeError('The provided Endpoint Name is invalid.');
      await expect(provider.endpoint(endpoint, request)).rejects.toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProvider] The provided Endpoint Name is invalid',
        '1c45b09f-96f6-4645-b8d5-4ee87380d6c5',
        { name: endpoint, request },
        error,
      );
    });

    it.each(invalidHttpRequests)('should throw when the provided Http Request is invalid.', async (request) => {
      const error = new TypeError('The provided Http Request is invalid.');
      await expect(provider.endpoint('token', request)).rejects.toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProvider] The provided Http Request is invalid',
        'd12e4ead-fe7f-4b5e-b7d5-a5c17626a014',
        { name: 'token', request },
        error,
      );
    });

    it('should throw when requesting an unsupported Endpoint.', async () => {
      const error = new TypeError('Unsupported Endpoint "unknown".');
      await expect(provider.endpoint('unknown' as any, request)).rejects.toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProvider] Unsupported Endpoint "unknown"',
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
        { name: 'unknown', request },
        error,
      );
    });

    it('should return an Http Response.', async () => {
      endpointMocks[0]!.handle.mockResolvedValueOnce(new HttpResponse());
      await expect(provider.endpoint('foo' as any, request)).resolves.toBeInstanceOf(HttpResponse);

      expect(endpointMocks[0]!.handle).toHaveBeenCalledExactlyOnceWith(request);
      expect(loggerMock.critical).not.toHaveBeenCalled();
    });
  });
});

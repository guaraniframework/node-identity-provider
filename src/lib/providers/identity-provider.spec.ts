import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

import { getContainer, Injectable, InjectAll } from '@guarani/di';

import { Endpoint } from '../endpoints/endpoint';
import { HttpRequest } from '../http/request/http-request';
import { HttpResponse } from '../http/response/http-response';
import { Logger } from '../logger/logger';
import { CONTAINER } from '../metadata/container.token';
import { IdentityProvider } from './identity-provider';

jest.mock('../logger/logger');

@Injectable()
class CustomIdentityProvider extends IdentityProvider {
  public constructor(logger: Logger, @InjectAll(Endpoint) endpoints: Endpoint[]) {
    super(logger, endpoints);
  }
  protected override createHttpRequest(_request: IncomingMessage): HttpRequest {
    throw new Error('Method not implemented.');
  }
  protected override parseHttpResponse(_httpResponse: HttpResponse, _response: ServerResponse): void {
    throw new Error('Method not implemented.');
  }
}

describe('Identity Provider', () => {
  let provider: IdentityProvider;

  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const endpointMock = jest.mocked<Endpoint>(
    Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
      path: '/oidc/authorization',
      httpMethods: ['GET'],
      handle: jest.fn(),
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(Endpoint).toValue(endpointMock);
    container.bind(IdentityProvider).toClass(CustomIdentityProvider);

    provider = container.resolve(IdentityProvider);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('handle()', () => {
    it('should return an Http 404 Not Found Response when the provided path is not supported.', async () => {
      jest.spyOn(provider, 'createHttpRequest' as any).mockReturnValueOnce(
        new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method: 'GET',
          url: new URL('https://idp.example.com/oidc/unknown'),
        }),
      );

      const response = new ServerResponse(expect.any(IncomingMessage));

      await expect(provider.handle(expect.any(IncomingMessage), response)).resolves.not.toThrow();

      expect(response.statusCode).toEqual(404);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[CustomIdentityProvider] Endpoint "/oidc/unknown" not found',
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
      );
    });

    it('should return an Http 405 Method Not Allowed Response when the provided Http Request Method is not supported by the Endpoint.', async () => {
      jest.spyOn(provider, 'createHttpRequest' as any).mockReturnValueOnce(
        new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method: 'POST',
          url: new URL('https://idp.example.com/oidc/authorization'),
        }),
      );

      const response = new ServerResponse(expect.any(IncomingMessage));

      await expect(provider.handle(expect.any(IncomingMessage), response)).resolves.not.toThrow();

      expect(response.statusCode).toEqual(405);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[CustomIdentityProvider] The Endpoint "/oidc/authorization" does not support the Http Request Method "POST"',
        '8d47604a-a586-4b71-9ce6-c13cf7dda9df',
      );
    });

    it('should return an Http Response.', async () => {
      endpointMock.handle.mockResolvedValueOnce(expect.any(HttpResponse));

      const createHttpRequestSpy = jest.spyOn(provider, 'createHttpRequest' as any).mockReturnValueOnce(
        new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method: 'GET',
          url: new URL('https://idp.example.com/oidc/authorization'),
        }),
      );

      const parseHttpResponse = jest.spyOn(provider, 'parseHttpResponse' as any).mockImplementationOnce(() => {});

      await expect(
        provider.handle(expect.any(IncomingMessage), new ServerResponse(expect.any(IncomingMessage))),
      ).resolves.not.toThrow();

      expect(createHttpRequestSpy).toHaveBeenCalledExactlyOnceWith(expect.any(IncomingMessage));
      expect(endpointMock.handle).toHaveBeenCalledExactlyOnceWith(expect.any(HttpRequest));
      expect(parseHttpResponse).toHaveBeenCalledExactlyOnceWith(expect.any(HttpResponse), expect.any(ServerResponse));
      expect(loggerMock.critical).not.toHaveBeenCalled();
    });
  });
});

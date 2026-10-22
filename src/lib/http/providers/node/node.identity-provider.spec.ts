import { Cookie, CookieAccessInfo } from 'cookiejar';
import { createServer, OutgoingHttpHeaders, Server } from 'http';
import request, { Agent } from 'supertest';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { EndpointName } from '../../../endpoints/endpoint-name.type';
import { MethodNotAllowedError } from '../../../errors/method-not-allowed/method-not-allowed.error';
import { NotFoundError } from '../../../errors/not-found/not-found.error';
import { ServerErrorError } from '../../../errors/server-error/server-error.error';
import { Logger } from '../../../loggers/logger';
import { Settings } from '../../../settings/settings';
import { HttpRequest } from '../../request/http-request';
import { HttpRequestMethod } from '../../request/http-request-method.enum';
import { HttpResponse } from '../../response/http-response';
import { HttpResponseStatus } from '../../response/http-response-status.enum';
import { NodeIdentityProvider } from './node.identity-provider';

jest.mock('../../../loggers/logger');

describe('Node Identity Provider', () => {
  let provider: NodeIdentityProvider;
  let server: Server;
  let agent: Agent;

  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const settings = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      issuer: new URL('https://provider.example.com'),
    }),
  );

  const endpointMock = jest.mocked<Endpoint>(
    Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
      name: 'custom' as EndpointName,
      path: '/oidc/custom',
      routes: [{ method: HttpRequestMethod.POST, handler: jest.fn() }],
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(Settings).toValue(settings);
    container.bind(Endpoint).toValue(endpointMock);
    container.bind(NodeIdentityProvider).toSelf().asSingleton();

    provider = container.resolve(NodeIdentityProvider);

    server = createServer(provider.handle);
    agent = request.agent(server);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should warn about the usage of the default Node Identity Provider.', () => {
      expect(loggerMock.warn).toHaveBeenCalledExactlyOnceWith(
        '[NodeIdentityProvider] Using the default Node Identity Provider. This is only recommended for development environments.',
        '0fa83143-3000-4c25-a21c-a77cc3b365b9',
        null,
      );
    });
  });

  describe('handle()', () => {
    it('should throw when failing to parse the Incoming Message into an Http Request.', async () => {
      const cause = new TypeError('Unsupported Http Request Method "OPTIONS".');
      const error = new ServerErrorError('An unexpected error occurred.', { cause, fatal: true });

      const response = await agent.options('/oidc/custom');

      expect(response.status).toBe(error.status);
      expect(response.body).toStrictEqual(removeNullishValues(error.toJSON()));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[NodeIdentityProvider] Failed to create the Http Request',
        'b9f9e7c2-a9ca-4999-b36d-e78f14d8c6c7',
        null,
        cause,
      );
    });

    it('should throw when the requested Endpoint does not exist.', async () => {
      const error = new NotFoundError('Endpoint "/oidc/unknown" not found.');

      const response = await agent
        .get('/oidc/unknown')
        .set('Cookie', ['cookie-name=cookie-value', 'cookie_name=cookie_value']);

      expect(response.status).toBe(error.status);
      expect(response.body).toStrictEqual(removeNullishValues(error.toJSON()));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        `[NodeIdentityProvider] Endpoint "/oidc/unknown" not found`,
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
        { http_request: expect.any(HttpRequest) },
        error,
      );
    });

    it('should throw when the requested Endpoint does not support the requested Http Request Method.', async () => {
      const error = new MethodNotAllowedError(
        'The Endpoint "/oidc/custom" does not support the Http Request Method "DELETE".',
      );

      const response = await agent.delete('/oidc/custom');

      expect(response.status).toBe(error.status);
      expect(response.body).toStrictEqual(removeNullishValues(error.toJSON()));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        `[NodeIdentityProvider] The Endpoint "/oidc/custom" does not support the Http Request Method "DELETE"`,
        '8d47604a-a586-4b71-9ce6-c13cf7dda9df',
        { http_request: expect.any(HttpRequest) },
        error,
      );
    });

    it('should return the Response for the requested Endpoint.', async () => {
      endpointMock.routes[0]!.handler.mockResolvedValueOnce(
        new HttpResponse()
          .setCookies({ '"': '', bad_value: [], bad_regex: '"', cookie: 'value', remove: null })
          .setHeaders({ pragma: 'no-store' })
          .setStatus(HttpResponseStatus.Created)
          .json({ message: 'Hello, World!' }),
      );

      const cookie = new Cookie('cookie=value', '127.0.0.1');
      cookie.explicit_path = true;
      cookie.noscript = true;

      const response = await agent
        .post('/oidc/custom')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('foo=bar');

      expect(response.status).toBe(HttpResponseStatus.Created);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>(
        expect.objectContaining({ 'content-type': 'application/json', pragma: 'no-store' }),
      );

      expect(response.body).toStrictEqual<NodeJS.Dict<unknown>>({ message: 'Hello, World!' });
      expect(agent.jar.getCookies(CookieAccessInfo.All)!).toStrictEqual(expect.arrayContaining([cookie]));
    });

    it('should return the Response for the requested Endpoint in a production environment.', async () => {
      Reflect.set(provider, 'environment', 'production');

      endpointMock.routes[0]!.handler.mockResolvedValueOnce(
        new HttpResponse()
          .setCookies({ '"': '', bad_value: [], bad_regex: '"', cookie: 'value', remove: null })
          .setHeaders({ pragma: 'no-store' })
          .setStatus(HttpResponseStatus.Created)
          .json({ message: 'Hello, World!' }),
      );

      const cookie = new Cookie('cookie=value', '127.0.0.1');
      cookie.explicit_path = true;
      cookie.noscript = true;
      cookie.secure = true;

      const response = await agent
        .post('/oidc/custom')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('foo=bar');

      expect(response.status).toBe(HttpResponseStatus.Created);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>(
        expect.objectContaining({ 'content-type': 'application/json', pragma: 'no-store' }),
      );

      expect(response.body).toStrictEqual<NodeJS.Dict<unknown>>({ message: 'Hello, World!' });
      expect(agent.jar.getCookies(CookieAccessInfo.All)!).toStrictEqual(expect.arrayContaining([cookie]));
    });
  });
});

import { Cookie, CookieAccessInfo } from 'cookiejar';
import http from 'http';
import { stringify as stringifyQs } from 'querystring';
import request, { Agent } from 'supertest';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { MethodNotAllowedError } from '../../../errors/method-not-allowed/method-not-allowed.error';
import { NotFoundError } from '../../../errors/not-found/not-found.error';
import { ConsoleLogger } from '../../../logger/console/console.logger';
import { IdentityProviderFactory } from '../../../metadata/factory/identity-provider.factory';
import { CONTAINER } from '../../../metadata/tokens';
import { Settings } from '../../../settings/settings';
import errorView from '../../../template-engine/template-string/views/error.view';
import { HttpRequest } from '../../request/http-request';
import { HttpResponseStatus } from '../../response/http-response-status.enum';
import { NodeIdentityServer } from './node.identity-server';

describe('Node Identity Server', () => {
  let server: NodeIdentityServer;
  let httpServer: http.Server;
  let agent: Agent;

  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  const container = getContainer(CONTAINER);

  const settings = new Settings({ issuer: 'https://provider.example.com' });

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(ConsoleLogger.prototype, 'error');
    loggerWarnSpy = jest.spyOn(ConsoleLogger.prototype, 'warn');

    server = new IdentityProviderFactory().addSettings(settings).create(NodeIdentityServer);
    server.bootstrap();

    httpServer = http.createServer(server.handle);
    agent = request.agent(httpServer);
  });

  afterEach(() => {
    container.clear();
    httpServer.closeAllConnections();

    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should warn about the usage of the Default Node Identity Server.', () => {
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '[NodeIdentityServer] Using the default Node Identity Server. This is only recommended for development environments.',
        '0fa83143-3000-4c25-a21c-a77cc3b365b9',
        null,
      );
    });
  });

  describe('handle()', () => {
    it('should throw when failing to parse the Http Request.', async () => {
      const error = new InvalidRequestError('The Http Request cannot have duplicate Parameters.', { fatal: true });

      const response = await agent.get('/oidc/error?foo=123&foo=456');

      expect(response.status).toEqual(error.status);
      expect(response.body).toMatchObject(removeNullishValues(error.toJSON()));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `[NodeIdentityServer] Failed to create the Http Request`,
        'b9f9e7c2-a9ca-4999-b36d-e78f14d8c6c7',
        null,
        error,
      );
    });

    it('should throw when the requested Endpoint does not exist.', async () => {
      const error = new NotFoundError('Endpoint "/oidc/custom" not found.');

      const response = await agent.get('/oidc/custom');

      expect(response.status).toEqual(error.status);
      expect(response.body).toMatchObject(removeNullishValues(error.toJSON()));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `[NodeIdentityServer] Endpoint "/oidc/custom" not found`,
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
        { http_request: expect.any(HttpRequest) },
        error,
      );
    });

    it('should throw when the requested Endpoint does not support the requested Http Request Method.', async () => {
      const error = new MethodNotAllowedError(
        'The Endpoint "/oidc/error" does not support the Http Request Method "DELETE".',
      );

      const response = await agent.delete('/oidc/error');

      expect(response.status).toEqual(error.status);
      expect(response.body).toMatchObject(removeNullishValues(error.toJSON()));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `[NodeIdentityServer] The Endpoint "/oidc/error" does not support the Http Request Method "DELETE"`,
        '8d47604a-a586-4b71-9ce6-c13cf7dda9df',
        { http_request: expect.any(HttpRequest) },
        error,
      );
    });

    it('should return the Http Response of the requested Endpoint.', async () => {
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      server['provider'].error = jest.fn().mockImplementationOnce(async (_, response) => {
        response
          .setStatus(HttpResponseStatus.OK)
          .setCookies({ '"': '', bad_value: [], bad_regex: '"', cookie: 'value', remove: null })
          .html(errorView(error.toJSON()));
      });

      const endpoint = server['router']['endpoints'].get('error')!;

      server['router']['endpoints'].set('error', {
        path: endpoint.path,
        routes: endpoint.routes.map((route) => ({
          ...route,
          handler: server['provider'].error.bind(server['provider']),
        })),
      });

      const cookie = new Cookie('cookie=value', '127.0.0.1');
      cookie.explicit_path = true;
      cookie.noscript = true;

      const response = await agent
        .post('/oidc/error')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['cookie_name=cookie_value'])
        .send(stringifyQs(removeNullishValues(error.toJSON())));

      expect(response.status).toEqual(HttpResponseStatus.OK);
      expect(response.text).toEqual(errorView(error.toJSON()));
      expect(response.headers).toMatchObject(expect.objectContaining({ 'content-type': 'text/html; charset=UTF-8' }));
      expect(agent.jar.getCookies(CookieAccessInfo.All)!).toEqual(expect.arrayContaining([cookie]));
    });

    it('should return the Http Response of the requested Endpoint for a production environment.', async () => {
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      Reflect.set(server, 'environment', 'production');

      server['provider'].error = jest.fn().mockImplementationOnce(async (_, response) => {
        response
          .setStatus(HttpResponseStatus.OK)
          .setCookies({ '"': '', bad_value: [], bad_regex: '"', cookie: 'value', remove: null })
          .html(errorView(error.toJSON()));
      });

      const endpoint = server['router']['endpoints'].get('error')!;

      server['router']['endpoints'].set('error', {
        path: endpoint.path,
        routes: endpoint.routes.map((route) => ({
          ...route,
          handler: server['provider'].error.bind(server['provider']),
        })),
      });

      const cookie = new Cookie('cookie=value', '127.0.0.1');
      cookie.explicit_path = true;
      cookie.noscript = true;
      cookie.secure = true;

      const response = await agent
        .post('/oidc/error')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['cookie_name=cookie_value'])
        .send(stringifyQs(removeNullishValues(error.toJSON())));

      expect(response.status).toEqual(HttpResponseStatus.OK);
      expect(response.text).toEqual(errorView(error.toJSON()));
      expect(response.headers).toMatchObject(expect.objectContaining({ 'content-type': 'text/html; charset=UTF-8' }));
      expect(agent.jar.getCookies(CookieAccessInfo.All)!).toEqual(expect.arrayContaining([cookie]));
    });
  });
});

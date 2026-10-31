import { Cookie, CookieAccessInfo } from 'cookiejar';
import { createServer, OutgoingHttpHeaders, Server } from 'http';
import { DatabaseSync } from 'node:sqlite';
import request, { Agent } from 'supertest';

import { JsonWebKeySet } from '@guarani/jose';
import { removeNullishValues } from '@guarani/primitives';

import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { MethodNotAllowedError } from '../../../errors/method-not-allowed/method-not-allowed.error';
import { NotFoundError } from '../../../errors/not-found/not-found.error';
import { ServerErrorError } from '../../../errors/server-error/server-error.error';
import { IdentityProviderFactory } from '../../../factory/identity-provider.factory';
import { ConsoleLogger } from '../../../loggers/console/console.logger';
import { Settings } from '../../../settings/settings';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { HttpRequest } from '../../request/http-request';
import { HttpResponse } from '../../response/http-response';
import { HttpResponseStatus } from '../../response/http-response-status.enum';
import { NodeIdentityProvider } from './node.identity-provider';

jest.mock('../../../loggers/logger');

describe('Node Identity Provider', () => {
  let provider: NodeIdentityProvider;
  let server: Server;
  let agent: Agent;
  let database: DatabaseSync;
  let jsonWebKeySet: JsonWebKeySet;

  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  const settings = new Settings({
    issuer: 'https://provider.example.com',
    secretKey: '0xBHeVjZgynYc0SQLqn7L1PYcba97SajmnEludmUiyYiPH2I94bHq9CtsVXMmhuR',
    interactions: {
      accountSelectionUrl: 'https://provider.example.com/auth/account-selection',
      consentUrl: 'https://provider.example.com/auth/consent',
      errorUrl: 'https://provider.example.com/oidc/error',
      loginUrl: 'https://provider.example.com/auth/login',
      registrationUrl: 'https://provider.example.com/auth/registration',
    },
  });

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(ConsoleLogger.prototype, 'error');
    loggerWarnSpy = jest.spyOn(ConsoleLogger.prototype, 'warn');

    database = new DatabaseSync(':memory:');
    jsonWebKeySet = new JsonWebKeySet([]);

    provider = new IdentityProviderFactory()
      .addAuthorizationEndpoint()
      .addInteractionEndpoint()
      .addTokenEndpoint()
      .addSettings(settings)
      .add(DatabaseSync, database)
      .add(JsonWebKeySet, jsonWebKeySet)
      .create(NodeIdentityProvider);

    server = createServer(provider.handle);
    agent = request.agent(server);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should warn about the usage of the default Node Identity Provider.', () => {
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '[NodeIdentityProvider] Using the default Node Identity Provider. This is only recommended for development environments.',
        '0fa83143-3000-4c25-a21c-a77cc3b365b9',
        null,
      );
    });
  });

  describe('Smoke Endpoints', () => {
    it('should have an Authorization Endpoint.', async () => {
      const error = new InvalidRequestError('Invalid parameter "response_type".');

      const response = await agent.get('/oidc/authorization');

      const location = addParametersToUrl(settings.interactions.errorUrl, error.toJSON());

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>(
        expect.objectContaining<OutgoingHttpHeaders>({ location: location.href }),
      );
    });

    it('should have an Interaction Endpoint.', async () => {
      const error = new InvalidRequestError('Invalid parameter "interaction_type".');

      const response = await agent.get('/oidc/interaction');

      expect(response.status).toBe(HttpResponseStatus.BadRequest);
      expect(response.body).toStrictEqual(error.toJSON());
    });

    it('should have a Token Endpoint.', async () => {
      const error = new InvalidRequestError('Invalid parameter "grant_type".');

      const response = await agent.post('/oidc/token').set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(HttpResponseStatus.BadRequest);
      expect(response.body).toStrictEqual(error.toJSON());
    });
  });

  describe('handle()', () => {
    it('should throw when failing to parse the Incoming Message into an Http Request.', async () => {
      const cause = new TypeError('Unsupported Http Request Method "OPTIONS".');
      const error = new ServerErrorError('An unexpected error occurred.', { cause, fatal: true });

      const response = await agent.options('/oidc/authorization');

      expect(response.status).toBe(error.status);
      expect(response.body).toStrictEqual(removeNullishValues(error.toJSON()));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
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

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `[NodeIdentityProvider] Endpoint "/oidc/unknown" not found`,
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
        { http_request: expect.any(HttpRequest) },
        error,
      );
    });

    it('should throw when the requested Endpoint does not support the requested Http Request Method.', async () => {
      const error = new MethodNotAllowedError(
        'The Endpoint "/oidc/authorization" does not support the Http Request Method "DELETE".',
      );

      const response = await agent.delete('/oidc/authorization');

      expect(response.status).toBe(error.status);
      expect(response.body).toStrictEqual(removeNullishValues(error.toJSON()));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `[NodeIdentityProvider] The Endpoint "/oidc/authorization" does not support the Http Request Method "DELETE"`,
        '8d47604a-a586-4b71-9ce6-c13cf7dda9df',
        { http_request: expect.any(HttpRequest) },
        error,
      );
    });

    it('should return the Response for the requested Endpoint.', async () => {
      jest
        .spyOn(provider['endpoints'].find((endpoint) => endpoint.name === 'authorization')!.routes[1]!, 'handler')
        .mockResolvedValueOnce(
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
        .post('/oidc/authorization')
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

      jest
        .spyOn(provider['endpoints'].find((endpoint) => endpoint.name === 'authorization')!.routes[1]!, 'handler')
        .mockResolvedValueOnce(
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
        .post('/oidc/authorization')
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

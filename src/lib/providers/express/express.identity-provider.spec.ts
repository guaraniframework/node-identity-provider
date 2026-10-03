import cookieParser from 'cookie-parser';
import express, { Express } from 'express';
import { OutgoingHttpHeaders } from 'http';
import request from 'supertest';

import { getContainer } from '@guarani/di';

import { Endpoint } from '../../endpoints/endpoint';
import { HttpResponse } from '../../http/response/http-response';
import { ConsoleLogger } from '../../logger/console.logger';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ContextInteractionResponse } from '../../responses/interaction/context/context.interaction-response';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { ExpressIdentityProvider } from './express.identity-provider';

jest.mock('../../logger/logger');

describe('Express Identity Provider', () => {
  let provider: ExpressIdentityProvider;
  let app: Express;

  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const endpointMock = jest.mocked<Endpoint>(
    Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
      name: 'interaction',
      path: '/oidc/interaction',
      httpMethods: ['GET', 'POST'],
      handle: jest.fn(),
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toClass(ConsoleLogger).asSingleton();
    container.bind(Endpoint).toValue(endpointMock);
    container.bind(ExpressIdentityProvider).toSelf().asSingleton();

    provider = container.resolve(ExpressIdentityProvider);

    app = express();

    app.use(cookieParser('super_safe_and_secure_secret'));
    app.use(provider.handle);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('handle()', () => {
    it('should return an Http 404 Not Found Response when the provided path is not supported.', async () => {
      const response = await request(app).get('/oidc/unknown');

      expect(response.status).toEqual(404);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[ExpressIdentityProvider] Endpoint "/oidc/unknown" not found',
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
      );
    });

    it('should return an Http 405 Method Not Allowed Response when the provided Http Request Method is not supported by the Endpoint.', async () => {
      const response = await request(app).delete('/oidc/interaction');

      expect(response.status).toEqual(405);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[ExpressIdentityProvider] The Endpoint "/oidc/interaction" does not support the Http Request Method "DELETE"',
        '8d47604a-a586-4b71-9ce6-c13cf7dda9df',
      );
    });

    it('should return an Identity Provider Http Response.', async () => {
      const authorizationRequest: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid profile email phone address',
      };

      const requestUrl = addParametersToUrl(
        new URL('https://idp.example.com/oidc/authorization'),
        authorizationRequest,
      );

      const interactionResponse: ContextInteractionResponse = { request_url: requestUrl.href, context: {} };

      endpointMock.handle.mockResolvedValueOnce(
        new HttpResponse()
          .json(interactionResponse)
          .setHeaders({ 'cache-control': 'no-store', pragma: 'no-cache' })
          .setCookies({ guarani_session: 'session_id', remove_cookie: null }),
      );

      const response = await request(app).get('/oidc/interaction');

      expect(response.status).toEqual(200);
      expect(response.headers).toMatchObject<OutgoingHttpHeaders>({ 'cache-control': 'no-store', pragma: 'no-cache' });
      expect(response.body).toStrictEqual(interactionResponse);
    });
  });
});

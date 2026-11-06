import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import qs from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify, removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../constants';
import { RevocationContext } from '../../context/revocation/revocation-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { RefreshToken } from '../../entities/refresh-token';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { HttpRoute } from '../../http/route/http-route';
import { Logger } from '../../loggers/logger';
import { RevocationRequest } from '../../requests/revocation/revocation-request';
import { RevocationValidator } from '../../validators/revocation/revocation.validator';
import { EndpointName } from '../endpoint-name.type';
import { RevocationEndpoint } from './revocation.endpoint';

jest.mock('../../loggers/logger');
jest.mock('../../validators/revocation/revocation.validator');

describe('Revocation Endpoint', () => {
  let endpoint: RevocationEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      revokeAccessToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    }),
  );

  const validatorMock = jest.mocked(RevocationValidator.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(RevocationValidator).toValue(validatorMock);
    container.bind(RevocationEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(RevocationEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "revocation" as its value.', () => {
      expect(endpoint.name).toBe<EndpointName>('revocation');
    });
  });

  describe('path', () => {
    it('should have "/oidc/revocation" as its value.', () => {
      expect(endpoint.path).toBe('/oidc/revocation');
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
    let parameters: RevocationRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });
    const anotherClient: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'another_client_id' });

    const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
      id: 'token_id',
      client,
    });

    const refreshToken: RefreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
      id: 'token_id',
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

    it('should return an Error Response when failing to validate the Revocation Request.', async () => {
      const request = requestFactory();

      const error = new InvalidRequestError('Invalid parameter "token".');

      validatorMock.validate.mockRejectedValueOnce(error);

      const response = await endpoint.handle(request);

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

      expect(loggerMock.error).toHaveBeenCalledWith(
        '[RevocationEndpoint] Failed handle()',
        '26e4aabf-0b3f-413e-9ae5-2fba2f3db6bc',
        { request, response },
        error,
      );

      expect(dataAccessMock.revokeAccessToken).not.toHaveBeenCalled();
      expect(dataAccessMock.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('should not revoke the provided Token because it does not exist.', async () => {
      const request = requestFactory();

      const context: RevocationContext = { parameters, client, token: null };

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'cache-control': 'no-store', pragma: 'no-cache' });
      expect(response.body).toBeEmpty();

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[RevocationEndpoint] Completed revokeToken()',
        '392b2f22-97c9-42f1-a330-5e89cd8ed73a',
        { context },
      );

      expect(dataAccessMock.revokeAccessToken).not.toHaveBeenCalled();
      expect(dataAccessMock.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it.each([accessToken, refreshToken])(
      'should not revoke the provided Token because the Client that requested it is not the one it was issued to.',
      async (token) => {
        const request = requestFactory();

        const context: RevocationContext = { parameters, client: anotherClient, token };

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        expect(response.status).toBe(HttpResponseStatus.OK);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
        });

        expect(response.body).toBeEmpty();

        expect(loggerMock.debug).toHaveBeenCalledWith(
          '[RevocationEndpoint] Completed revokeToken()',
          'a293bae3-5702-45f8-b5f4-7ef636dc910e',
          { context },
        );

        expect(dataAccessMock.revokeAccessToken).not.toHaveBeenCalled();
        expect(dataAccessMock.revokeRefreshToken).not.toHaveBeenCalled();
      },
    );

    it('should revoke the provided Access Token.', async () => {
      const request = requestFactory();

      const context: RevocationContext = { parameters, client, token: accessToken };

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
      });

      expect(response.body).toBeEmpty();

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[RevocationEndpoint] Completed revokeToken()',
        '78f45220-e889-4106-b848-32f016329a4a',
        { context },
      );

      expect(dataAccessMock.revokeAccessToken).toHaveBeenCalledExactlyOnceWith(accessToken);
    });

    it('should revoke the provided Refresh Token.', async () => {
      const request = requestFactory();

      const context: RevocationContext = { parameters, client, token: refreshToken };

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
      });

      expect(response.body).toBeEmpty();

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[RevocationEndpoint] Completed revokeToken()',
        '5e2977f3-5ed9-4c46-9956-34d9c4771c8d',
        { context },
      );

      expect(dataAccessMock.revokeRefreshToken).toHaveBeenCalledExactlyOnceWith(refreshToken);
    });
  });
});

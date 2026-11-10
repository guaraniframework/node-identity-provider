import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import qs from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify, removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../constants';
import { IntrospectionContext } from '../../context/introspection/introspection-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { RefreshToken } from '../../entities/refresh-token';
import { Scope } from '../../entities/scope';
import { User } from '../../entities/user';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { HttpRoute } from '../../http/route/http-route';
import { Logger } from '../../loggers/logger';
import { IntrospectionRequest } from '../../requests/introspection/introspection-request';
import { IntrospectionResponse } from '../../responses/introspection/introspection-response';
import { Settings } from '../../settings/settings';
import { SubjectType } from '../../subject-types/subject-type';
import { IntrospectionValidator } from '../../validators/introspection/introspection.validator';
import { EndpointName } from '../endpoint-name.type';
import { IntrospectionEndpoint } from './introspection.endpoint';

jest.mock('../../loggers/logger');
jest.mock('../../validators/introspection/introspection.validator');

describe('Introspection Endpoint', () => {
  let endpoint: IntrospectionEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), { getTokenMetadata: jest.fn() }),
  );

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      issuer: new URL('https://provider.example.com'),
    }),
  );

  const validatorMock = jest.mocked(IntrospectionValidator.prototype);

  const subjectTypeMock = jest.mocked<SubjectType>(
    Object.assign<SubjectType, Partial<SubjectType>>(Reflect.construct(SubjectType, []), {
      name: 'public',
      calculateSubjectIdentifier: jest.fn(),
    }),
  );

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(IntrospectionValidator).toValue(validatorMock);
    container.bind(SubjectType).toValue(subjectTypeMock);
    container.bind(IntrospectionEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(IntrospectionEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "introspection" as its value.', () => {
      expect(endpoint.name).toBe<EndpointName>('introspection');
    });
  });

  describe('path', () => {
    it('should have "/oidc/introspection" as its value.', () => {
      expect(endpoint.path).toBe('/oidc/introspection');
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

  describe('constructor', () => {
    it('should throw when not implementing the method DataAccess.getTokenMetadata().', () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {}),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(Settings).toValue(settingsMock);
      container.bind(IntrospectionValidator).toValue(validatorMock);
      container.bind(SubjectType).toValue(subjectTypeMock);
      container.bind(IntrospectionEndpoint).toSelf().asSingleton();

      const error = new TypeError('Missing implementation of required method "DataAccess.getTokenMetadata".');
      expect(() => container.resolve(IntrospectionEndpoint)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.fatal).toHaveBeenCalledExactlyOnceWith(
        '[IntrospectionEndpoint] Missing implementation of required method "DataAccess.getTokenMetadata"',
        '3c2c9c6a-eb3f-46fa-ae94-21dfac86dfcb',
        null,
        error,
      );
    });
  });

  describe('handle()', () => {
    let parameters: IntrospectionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'client_id',
      subjectType: 'public',
    });

    const anotherClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'another_client_id',
      subjectType: 'public',
    });

    const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });

    const scopes: Scope[] = ['foo', 'bar', 'baz', 'qux'].map((name) =>
      Object.assign<Scope, Partial<Scope>>(new Scope(), { name }),
    );

    const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
      id: 'token_id',
      type: 'Bearer',
      scopes,
      client,
      user,
    });

    const refreshToken: RefreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
      id: 'token_id',
      scopes,
      client,
      user,
    });

    const requestFactory = (data: Partial<IntrospectionRequest> = {}): HttpRequest => {
      removeNullishValues<IntrospectionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(qs.stringify(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/introspection'),
      });
    };

    beforeEach(() => {
      parameters = { token: 'token_id' };

      Object.assign<AccessToken, Partial<AccessToken>>(accessToken, {
        createdAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        validAfter: new Date(Date.now() - 3600000),
      });

      Object.assign<RefreshToken, Partial<RefreshToken>>(refreshToken, {
        createdAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        validAfter: new Date(Date.now() - 3600000),
      });
    });

    it('should return an Error Response when failing to validate the Introspection Request.', async () => {
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
        '[IntrospectionEndpoint] Failed handle()',
        '0c1b890d-5340-4ff8-aacd-edef4f9c3f34',
        { request, response },
        error,
      );
    });

    it('should return an Inactive Token Response because the provided Token does not exist.', async () => {
      const request = requestFactory();

      const context: IntrospectionContext = { parameters, client, token: null };
      const introspectionResponse: IntrospectionResponse = { active: false };

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[IntrospectionEndpoint] Completed introspectToken()',
        '55e4f242-4e31-44b3-91d2-3e9f15a7402e',
        { context },
      );
    });

    it.each([accessToken, refreshToken])(
      'should return an Inactive Token Response because the Client provided a Token not issued to itself.',
      async (token) => {
        const request = requestFactory();

        const context: IntrospectionContext = { parameters, client: anotherClient, token };
        const introspectionResponse: IntrospectionResponse = { active: false };

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        expect(response.status).toBe(HttpResponseStatus.OK);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
        });

        expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

        expect(loggerMock.debug).toHaveBeenCalledWith(
          '[IntrospectionEndpoint] Completed introspectToken()',
          '7921bb34-766d-459b-8ea0-ae3a5693ed06',
          { context },
        );
      },
    );

    it.each([accessToken, refreshToken])(
      'should return an Inactive Token Response because provided Token is expired.',
      async (token) => {
        Reflect.set(token, 'expiresAt', new Date(Date.now() - 86400000));

        const request = requestFactory();

        const context: IntrospectionContext = { parameters, client, token };
        const introspectionResponse: IntrospectionResponse = { active: false };

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        expect(response.status).toBe(HttpResponseStatus.OK);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
        });

        expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

        expect(loggerMock.debug).toHaveBeenCalledWith(
          '[IntrospectionEndpoint] Completed introspectToken()',
          'e34865a7-a483-4d1c-9c17-2b7e720b26bc',
          { context, token },
        );

        Reflect.set(token, 'expiresAt', new Date(Date.now() + 86400000));
      },
    );

    it.each([accessToken, refreshToken])(
      'should return an Inactive Token Response because provided Token is not yet valid.',
      async (token) => {
        Reflect.set(token, 'validAfter', new Date(Date.now() + 3600000));

        const request = requestFactory();

        const context: IntrospectionContext = { parameters, client, token };
        const introspectionResponse: IntrospectionResponse = { active: false };

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        expect(response.status).toBe(HttpResponseStatus.OK);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
        });

        expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

        expect(loggerMock.debug).toHaveBeenCalledWith(
          '[IntrospectionEndpoint] Completed introspectToken()',
          '5d67fc61-44f4-4330-9ce9-6e914bc4223b',
          { context, token },
        );

        Reflect.set(token, 'validAfter', new Date(Date.now() - 3600000));
      },
    );

    it.each([accessToken, refreshToken])(
      'should return an Inactive Token Response because provided Token is revoked.',
      async (token) => {
        Reflect.set(token, 'revokedAt', new Date(Date.now() - 3600000));

        const request = requestFactory();

        const context: IntrospectionContext = { parameters, client, token };
        const introspectionResponse: IntrospectionResponse = { active: false };

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        expect(response.status).toBe(HttpResponseStatus.OK);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
        });

        expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

        expect(loggerMock.debug).toHaveBeenCalledWith(
          '[IntrospectionEndpoint] Completed introspectToken()',
          '1503b260-3794-4a08-8d46-aff84c2c9a75',
          { context, token },
        );

        Reflect.set(token, 'revokedAt', null);
      },
    );

    it('should return the metadata of the provided Refresh Token.', async () => {
      const request = requestFactory();

      const context: IntrospectionContext = { parameters, client, token: refreshToken };

      const introspectionResponse: IntrospectionResponse = {
        active: true,
        scope: 'foo bar baz qux',
        client_id: 'client_id',
        username: 'j.doe',
        exp: 1786579200,
        iat: 1786489200,
        nbf: 1786489200,
        sub: 'user_id',
        aud: 'client_id',
        iss: 'https://provider.example.com/',
        jti: 'jwt_id',
        foo: 'bar',
      };

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.getTokenMetadata!.mockResolvedValueOnce({ username: 'j.doe', jti: 'jwt_id', foo: 'bar' });
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce('user_id');

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[IntrospectionEndpoint] Completed introspectToken()',
        '68cd91cf-2cfb-494d-9b15-5a2c28ce8627',
        { context, token: refreshToken, introspection_response: introspectionResponse },
      );
    });

    it('should return the metadata of the provided Userless Access Token.', async () => {
      Reflect.set(accessToken, 'user', null);

      const request = requestFactory();

      const context: IntrospectionContext = { parameters, client, token: accessToken };

      const introspectionResponse: IntrospectionResponse = {
        active: true,
        scope: 'foo bar baz qux',
        client_id: 'client_id',
        token_type: 'Bearer',
        exp: 1786579200,
        iat: 1786489200,
        nbf: 1786489200,
        aud: 'client_id',
        iss: 'https://provider.example.com/',
        jti: 'jwt_id',
        foo: 'bar',
      };

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.getTokenMetadata!.mockResolvedValueOnce({ jti: 'jwt_id', foo: 'bar' });

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[IntrospectionEndpoint] Completed introspectToken()',
        '68cd91cf-2cfb-494d-9b15-5a2c28ce8627',
        { context, token: accessToken, introspection_response: introspectionResponse },
      );

      expect(subjectTypeMock.calculateSubjectIdentifier).not.toHaveBeenCalled();

      Reflect.set(accessToken, 'user', user);
    });

    it('should return the metadata of the provided Access Token.', async () => {
      const request = requestFactory();

      const context: IntrospectionContext = { parameters, client, token: accessToken };

      const introspectionResponse: IntrospectionResponse = {
        active: true,
        scope: 'foo bar baz qux',
        client_id: 'client_id',
        username: 'j.doe',
        token_type: 'Bearer',
        exp: 1786579200,
        iat: 1786489200,
        nbf: 1786489200,
        sub: 'user_id',
        aud: 'client_id',
        iss: 'https://provider.example.com/',
        jti: 'jwt_id',
        foo: 'bar',
      };

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.getTokenMetadata!.mockResolvedValueOnce({ username: 'j.doe', jti: 'jwt_id', foo: 'bar' });
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce('user_id');

      const response = await endpoint.handle(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(introspectionResponse), 'utf8'));

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[IntrospectionEndpoint] Completed introspectToken()',
        '68cd91cf-2cfb-494d-9b15-5a2c28ce8627',
        { context, token: accessToken, introspection_response: introspectionResponse },
      );
    });
  });
});
